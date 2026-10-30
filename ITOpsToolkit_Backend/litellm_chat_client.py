"""
LiteLLM Chat Client wrapper for Microsoft Agent Framework (v1.4.0+)
Fully compatible with all Agent Framework features including:
- Chat, streaming, image analysis
- Tools/function calling with auto-invocation
- Middleware support (chat, agent, function)
- Context providers
- Thread management
- Serialization/deserialization
- All chat options (temperature, max_tokens, etc.)

Installation:
    pip install agent-framework
    pip install litellm

Usage:
    from litellm_agent_framework import LiteLLMChatClient

    # Create client
    client = LiteLLMChatClient(
        model="gpt-4o",
        api_key="your-key"  # or use env var
    )

    # Use as agent
    agent = client.create_agent(
        name="Assistant",
        instructions="You are helpful",
        tools=[my_function]
    )

    result = await agent.run("Hello!")
"""

import json
import base64
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Sequence, Union
import litellm
from litellm import acompletion

from agent_framework import (
    BaseChatClient,
    FunctionInvocationLayer,
    ChatMiddlewareLayer,
    Message,
    ChatResponse,
    ChatResponseUpdate,
    Content,
    FunctionTool,
    Agent,
    tool,
)

# litellm._turn_on_debug()


class LiteLLMChatClient(FunctionInvocationLayer, ChatMiddlewareLayer, BaseChatClient):
    """
    LiteLLM Chat Client for Microsoft Agent Framework.

    Fully compatible with all Agent Framework features:
    - All LiteLLM providers (OpenAI, Anthropic, Google, Azure, Bedrock, etc.)
    - Streaming and non-streaming responses
    - Multi-modal inputs (text + images)
    - Tool/function calling with auto-invocation
    - Middleware support (chat, agent, function)
    - Context providers
    - Thread management
    - Full serialization support

    Function invocation and middleware are handled by the Agent class.
    """

    # Mark which fields should NOT be serialized (injected at runtime)
    INJECTABLE = {"_litellm_params"}

    def __init__(
        self,
        model: str,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        frequency_penalty: Optional[float] = None,
        presence_penalty: Optional[float] = None,
        stop: Optional[Union[str, List[str]]] = None,
        **kwargs
    ):
        """
        Initialize LiteLLM Chat Client.

        Args:
            model: Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022',
                   'gemini/gemini-1.5-pro', 'bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0')
            api_key: API key for the provider (or use environment variable)
            api_base: Custom API base URL
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
            frequency_penalty: Frequency penalty
            presence_penalty: Presence penalty
            stop: Stop sequences
            **kwargs: Additional LiteLLM parameters
        """
        super().__init__()

        self.model = model
        self.api_key = api_key
        self.api_base = api_base

        # Token usage tracking
        self.usage = {}

        # Store default chat options as a dict (ChatOptions is now a TypedDict)
        self._default_options: Dict[str, Any] = {
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "frequency_penalty": frequency_penalty,
            "presence_penalty": presence_penalty,
            "stop": stop if isinstance(stop, list) else ([stop] if stop else None),
        }

        # Store extra LiteLLM params
        self._litellm_params = kwargs

    def _inner_get_response(
        self,
        *,
        messages: Sequence[Message],
        stream: bool,
        options: Dict[str, Any],
        **kwargs: Any,  # accepted but not forwarded — framework internals only
    ):
        """
        Internal method to get a response (streaming or non-streaming).
        Required by BaseChatClient.

        When stream=False, returns an Awaitable[ChatResponse].
        When stream=True, returns a ResponseStream.
        """
        if stream:
            return self._build_response_stream(
                self._stream_impl(messages, options)
            )
        else:
            return self._non_stream_impl(messages, options)

    async def _non_stream_impl(
        self,
        messages: Sequence[Message],
        options: Dict[str, Any],
    ) -> ChatResponse:
        """Non-streaming implementation."""
        tools = options.get("tools") if options else None

        # Convert to LiteLLM format
        litellm_messages = self._convert_messages_to_litellm(messages)
        litellm_tools = self._convert_tools_to_litellm(tools) if tools else None

        # Prepare request parameters
        request_params = self._prepare_request_params(litellm_tools, options=options)

        # Azure JSON mode requires the literal word "json" in the messages array.
        # MAF doesn't always inject the agent's instructions as a message on every
        # call path (e.g., handoff turns), so prepend a reminder if needed.
        litellm_messages = self._ensure_json_mention_if_needed(litellm_messages, request_params)

        # Make API call
        response = await acompletion(
            model=self.model,
            messages=litellm_messages,
            **request_params
        )

        # Capture usage directly from response
        if hasattr(response, "usage") and response.usage:
            self.usage = response.usage.to_dict()

        # Convert response
        return self._convert_litellm_response(response)

    async def _stream_impl(
        self,
        messages: Sequence[Message],
        options: Dict[str, Any],
    ) -> AsyncIterator[ChatResponseUpdate]:
        """Streaming implementation."""
        tools = options.get("tools") if options else None

        # Convert to LiteLLM format
        litellm_messages = self._convert_messages_to_litellm(messages)
        litellm_tools = self._convert_tools_to_litellm(tools) if tools else None

        # ---- GEMINI / VERTEX guard: last message must be user ----
        if litellm_messages:
            last_role = (litellm_messages[-1].get("role") or "").lower()
            if last_role and last_role != "user":
                # Bridge message to satisfy Vertex requirement
                litellm_messages = list(litellm_messages) + [{
                    "role": "user",
                    "content": "Please continue and provide the final answer."
                }]

        # Prepare request parameters
        request_params = self._prepare_request_params(litellm_tools, options=options)
        request_params["stream"] = True

        # Azure JSON mode requires the literal word "json" in the messages array.
        litellm_messages = self._ensure_json_mention_if_needed(litellm_messages, request_params)

        # Make streaming API call
        stream = await acompletion(
            model=self.model,
            messages=litellm_messages,
            **request_params
        )

        # Stream responses
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                yield self._convert_litellm_chunk(chunk)

    @staticmethod
    def _ensure_json_mention_if_needed(
        litellm_messages: List[Dict[str, Any]],
        request_params: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Azure OpenAI's json_object response_format rejects requests whose
        `messages` array does not contain the literal substring "json" anywhere.
        If the agent's system instruction isn't included in this call's messages
        (which happens on some MAF handoff turns), prepend a small system
        reminder so the API accepts the request.
        """
        response_format = request_params.get("response_format")
        if not (isinstance(response_format, dict) and response_format.get("type") == "json_object"):
            return litellm_messages

        def _content_text(content) -> str:
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, dict) and isinstance(part.get("text"), str):
                        parts.append(part["text"])
                return " ".join(parts)
            return ""

        for msg in litellm_messages:
            if "json" in _content_text(msg.get("content")).lower():
                return litellm_messages

        return [{"role": "system", "content": "Respond with valid JSON only."}, *litellm_messages]

    def _prepare_request_params(
        self,
        tools: Optional[List[Dict[str, Any]]] = None,
        *,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Prepare request parameters for LiteLLM."""
        # Start with stored LiteLLM params
        params = dict(self._litellm_params)

        # Add credentials
        if self.api_key:
            params["api_key"] = self.api_key
        if self.api_base:
            params["api_base"] = self.api_base

        # Add tools
        if tools:
            params["tools"] = tools
            params["tool_choice"] = (options or {}).get("tool_choice", "auto")

        # Only extract litellm-compatible keys from options.
        # Framework-internal keys (middleware, tools, instructions, etc.) must NOT
        # be forwarded — litellm would try to JSON-serialize them for the API call.
        _LITELLM_OPTION_KEYS = {
            "temperature", "max_tokens", "top_p", "frequency_penalty",
            "presence_penalty", "stop", "seed", "logit_bias", "user",
            "response_format", "tool_choice",
        }

        opt = options or {}
        for key in ("temperature", "max_tokens", "top_p", "frequency_penalty", "presence_penalty"):
            val = opt.get(key)
            if val is not None:
                params[key] = val
            elif self._default_options.get(key) is not None:
                params[key] = self._default_options[key]

        stop_val = opt.get("stop") or self._default_options.get("stop")
        if stop_val:
            params["stop"] = stop_val

        # Forward other litellm-safe option keys (seed, logit_bias, user, etc.)
        for key in _LITELLM_OPTION_KEYS - {"temperature", "max_tokens", "top_p",
                                            "frequency_penalty", "presence_penalty",
                                            "stop", "tool_choice"}:
            val = opt.get(key)
            if val is not None:
                params[key] = val

        # Do NOT forward kwargs — they come from the agent framework internals
        # (middleware, session objects, etc.) and are not meant for litellm.

        return params

    def _convert_messages_to_litellm(
        self,
        messages: Sequence[Message]
    ) -> List[Dict[str, Any]]:
        """Convert Agent Framework messages to LiteLLM/OpenAI chat format."""
        litellm_messages: List[Dict[str, Any]] = []

        for msg in messages:
            role = msg.role
            contents = msg.contents if isinstance(msg.contents, list) else []

            # ---- 1) If message contains function_result content => emit TOOL messages ----
            tool_results = [c for c in contents if c.type == "function_result"]
            if tool_results:
                for tr in tool_results:
                    value = tr.result
                    if isinstance(value, list):
                        # If it's mistakenly a list of content objects, extract the text
                        if len(value) == 1 and hasattr(value[0], "text"):
                            value = value[0].text
                        else:
                            value = str(value)

                    litellm_messages.append({
                        "role": "tool",
                        "tool_call_id": tr.call_id,
                        "content": value,
                    })
                continue  # do not also create a content-parts message for this Message

            # ---- 2) Collect tool calls (assistant tool_calls) ----
            tool_calls = [c for c in contents if c.type == "function_call"]
            lit_tool_calls = []
            for tc in tool_calls:
                args = tc.arguments
                if not isinstance(args, str):
                    args = json.dumps(args or {})
                lit_tool_calls.append({
                    "id": tc.call_id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": args,
                    },
                })

            # ---- 3) Build multimodal content parts (TEXT/IMAGES ONLY) ----
            content_parts = []
            for c in contents:
                if c.type == "text":
                    content_parts.append({"type": "text", "text": c.text})
                elif c.type in ("uri", "data"):
                    # Both uri and data content store the URI in c.uri
                    # (from_data auto-encodes to data:mime;base64,... URI)
                    content_parts.append({"type": "image_url", "image_url": {"url": c.uri}})

            # ---- 4) Create the outgoing message ----
            out_msg: Dict[str, Any] = {
                "role": role,
                "content": content_parts if content_parts else (msg.text or "")
            }

            # Attach tool_calls ONLY at top-level on assistant messages
            if lit_tool_calls:
                out_msg["role"] = "assistant"
                out_msg["tool_calls"] = lit_tool_calls
                # OpenAI/Azure allow empty content when tool_calls present
                if "content" not in out_msg or out_msg["content"] is None:
                    out_msg["content"] = ""

            litellm_messages.append(out_msg)

        return litellm_messages


    def _tool_parameters_to_schema(self, t: FunctionTool) -> Dict[str, Any]:
        """
        Return JSON-serializable schema dict for tool parameters.
        Handles cases where tool.parameters is:
        - a method returning dict/schema
        - a Pydantic model class/instance (v2: model_json_schema)
        - already a dict
        """
        params = getattr(t, "parameters", None)

        # If it's a method/function, CALL it
        if callable(params):
            params = params()

        # If it's a Pydantic v2 model/class with model_json_schema
        if hasattr(params, "model_json_schema"):
            params = params.model_json_schema()

        # If it's still not a dict, try to coerce safely
        if params is None:
            return {"type": "object", "properties": {}}

        if isinstance(params, dict):
            return params

        return {"type": "object", "properties": {}}


    def _convert_tools_to_litellm(
        self,
        tools: Sequence[Union[FunctionTool, Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Convert Agent Framework tools to LiteLLM format."""
        litellm_tools = []
        for t in tools:
            if isinstance(t, FunctionTool):
                schema = self._tool_parameters_to_schema(t)
                litellm_tools.append({
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": schema
                    }
                })
            elif isinstance(t, dict):
                # Already in correct format
                litellm_tools.append(t)

        return litellm_tools

    def _convert_litellm_response(self, response) -> ChatResponse:
        """Convert LiteLLM response to Agent Framework format."""
        choice = response.choices[0]
        message = choice.message

        # Build contents
        contents = []

        # Add text content
        if message.content:
            contents.append(Content.from_text(message.content))

        # Add function calls
        if hasattr(message, "tool_calls") and message.tool_calls:
            for tc in message.tool_calls:
                contents.append(Content.from_function_call(
                    call_id=tc.id,
                    name=tc.function.name,
                    arguments=tc.function.arguments,
                ))

        # Build usage details
        usage_details = None
        if hasattr(response, "usage") and response.usage:
            usage_details = {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

        # Create response message
        response_message = Message(
            role="assistant",
            contents=contents,
        )

        # Determine finish reason
        finish_reason = "stop"
        if choice.finish_reason == "tool_calls":
            finish_reason = "tool_calls"
        elif choice.finish_reason == "length":
            finish_reason = "length"

        return ChatResponse(
            messages=[response_message],
            finish_reason=finish_reason,
            usage_details=usage_details,
        )

    def _convert_litellm_chunk(self, chunk) -> ChatResponseUpdate:
        """Convert LiteLLM streaming chunk to Agent Framework format."""
        choice = chunk.choices[0]
        delta = choice.delta

        # Build contents
        contents = []

        if hasattr(delta, "content") and delta.content:
            contents.append(Content.from_text(delta.content))

        if hasattr(delta, "tool_calls") and delta.tool_calls:
            for tc in delta.tool_calls:
                if hasattr(tc, "function"):
                    contents.append(Content.from_function_call(
                        call_id=tc.id if hasattr(tc, "id") and tc.id else "",
                        name=tc.function.name if hasattr(tc.function, "name") and tc.function.name else "",
                        arguments=tc.function.arguments if hasattr(tc.function, "arguments") else "",
                    ))

        # Determine finish reason
        finish_reason = None
        if choice.finish_reason:
            if choice.finish_reason == "stop":
                finish_reason = "stop"
            elif choice.finish_reason == "tool_calls":
                finish_reason = "tool_calls"
            elif choice.finish_reason == "length":
                finish_reason = "length"

        return ChatResponseUpdate(
            contents=contents if contents else None,
            finish_reason=finish_reason,
        )

    def create_agent(
        self,
        name: str = "Agent",
        instructions: str = "You are a helpful assistant.",
        tools: Optional[List[Callable]] = None,
        **kwargs
    ) -> Agent:
        """
        Create an Agent using this LiteLLM client.

        Args:
            name: Agent name
            instructions: System instructions
            tools: List of Python functions to use as tools
            **kwargs: Additional Agent parameters (context_providers, middleware, etc.)

        Returns:
            Agent instance
        """
        return Agent(
            client=self,
            instructions=instructions,
            name=name,
            tools=tools or [],
            **kwargs
        )

    # Serialization support
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the client to a dictionary."""
        return {
            "type": "litellm_chat_client",
            "model": self.model,
            "api_base": self.api_base,
            "temperature": self._default_options.get("temperature"),
            "max_tokens": self._default_options.get("max_tokens"),
            "top_p": self._default_options.get("top_p"),
            "frequency_penalty": self._default_options.get("frequency_penalty"),
            "presence_penalty": self._default_options.get("presence_penalty"),
            "stop": self._default_options.get("stop"),
        }

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
        dependencies: Optional[Dict[str, Any]] = None
    ) -> "LiteLLMChatClient":
        """Deserialize the client from a dictionary."""
        # Extract parameters
        model = data["model"]
        api_base = data.get("api_base")
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens")
        top_p = data.get("top_p")
        frequency_penalty = data.get("frequency_penalty")
        presence_penalty = data.get("presence_penalty")
        stop = data.get("stop")

        # Get API key from dependencies (never serialize API keys)
        api_key = None
        if dependencies and "api_key" in dependencies:
            api_key = dependencies["api_key"]

        return cls(
            model=model,
            api_key=api_key,
            api_base=api_base,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            stop=stop
        )


# Example usage
if __name__ == "__main__":
    import asyncio
    from typing import Annotated
    from agent_framework import tool

    from llm import LLM
    llm = LLM()
    llm_info = llm.get_llm_details("azure_gpt4o").llm_config
    llm.set_litellm_environment("azure_gpt4o")

    # Define a tool
    @tool
    async def get_weather(
        location: Annotated[str, "City name"]
    ) -> str:
        """Get weather for a location."""
        return f"The weather in {location} is sunny, 72°F"

    async def example_basic():
        """Example: Basic chat"""
        client = llm.client

        agent = client.create_agent(
            name="Assistant",
            instructions="You are a helpful assistant."
        )

        result = await agent.run("Tell me a short joke about AI")
        #   print(result.text)

    async def example_with_tools():
        """Example: Agent with tools"""
        client = llm.client
        agent = client.create_agent(
            name="WeatherBot",
            instructions="You help users check the weather.",
            tools=[get_weather]
        )

        result = await agent.run("What's the weather in Paris?")
        #   print(result.text)

    async def example_with_images():
        """Example: Image analysis"""
        from agent_framework import Message, Content

        client = llm.client

        agent = client.create_agent(
            name="VisionBot",
            instructions="You analyze images."
        )

        message = Message(
            role="user",
            contents=[
                Content.from_text("What's in this image?"),
                Content.from_uri(
                    "https://picsum.photos/200",
                    media_type="image/jpeg"
                )
            ]
        )

        result = await agent.run(message)
        #   print(result.text)

    async def example_streaming():
        """Example: Streaming response"""
        client = llm.client
        agent = client.create_agent(
            name="Assistant",
            instructions="You are a helpful assistant."
        )
        #   print("Streaming response:")
        async for chunk in agent.run("Write a haiku about code", stream=True):
            if chunk.text:
                #   print(chunk.text, end="", flush=True)
        #   print()
                pass

    async def example_middleware():
        """Example: Using middleware"""
        from agent_framework import chat_middleware, ChatContext

        @chat_middleware
        async def logging_middleware(context: ChatContext, next):
            #   print(f"[Middleware] Sending {len(context.messages)} messages")
            await next(context)
            #   print(f"[Middleware] Received response")

        client = llm.client

        agent = client.create_agent(
            name="LogBot",
            instructions="You are helpful.",
            middleware=[logging_middleware]
        )

        await agent.run("Hello!")

    async def example_serialization():
        """Example: Serialization and deserialization"""
        client = llm.client

        # Serialize
        data = client.to_dict()
        #   print("Serialized:", data)

        # Deserialize (inject API key as dependency)
        restored_client = LiteLLMChatClient.from_dict(
            data,
            dependencies={"api_key": "test-key"}
        )

        #   print("Restored model:", restored_client.model)

    # Run examples
    # asyncio.run(example_basic())
    # asyncio.run(example_with_tools())
    # asyncio.run(example_with_images())
    asyncio.run(example_streaming())
    # asyncio.run(example_middleware())
    # asyncio.run(example_serialization())
 
