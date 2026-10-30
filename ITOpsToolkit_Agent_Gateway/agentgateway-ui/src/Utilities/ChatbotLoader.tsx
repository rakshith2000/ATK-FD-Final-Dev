import React from "react";

const ChatbotLoader = () => (
  <>
    <style>
      {`
        span[data-loader] {
          display: inline-block;
          font-size: 1rem;
          line-height: 1.4em;
          height: 1.4em;
          overflow: hidden;
          position: relative;
        }

        span[data-loader]:before {
          content: "Generating...\\Aज...\\Aजe...\\Aज⟒n...\\Aज⟒n⟒...\\Aज⟒ner...\\AGenera...\\AGenerat...\\AGe⋏erati..\\AGenerat⟟n.\\AGenerati⋏g";
          white-space: pre;
          display: inline-block;
          animation: scrollText 1.5s infinite steps(11) alternate;
                     
          background: linear-gradient(90deg, #1a3d7c, #3f6fd1, #1a3d7c); /* blue gradient */
         
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes scrollText {
          100% { transform: translateY(-100%) }
        }

        @keyframes fadePulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}
    </style>

    <span data-loader />
  </>
);

export default ChatbotLoader;
