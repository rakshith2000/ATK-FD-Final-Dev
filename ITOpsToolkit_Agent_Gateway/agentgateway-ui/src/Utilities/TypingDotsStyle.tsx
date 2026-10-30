import React from "react";

const TypingDotsStyle = () => (
  <style>
    {`
      
        .typing-dots span {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
  animation: blink 1s infinite;
  margin-left: 2px;
  // color: white;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

    `}
  </style>
);

export default TypingDotsStyle;
