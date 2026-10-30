import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ChatInBarChart from "../Components/Charts/ChatInBarChart"
import FinopsChart from "../Components/Charts/FinopsChart";
import ChatbotLoader from "./ChatbotLoader";
import { CiUser } from "react-icons/ci";
import { wrapIcon } from "./WrapIcons";
import chatbotIcon from "../../assets/chatbot.png";
import { useAppSelector } from "../../app/hooks";
import { selectCommonConfig } from "../Components/CommonConfig/commonConfigSlice";
import { createRoot } from 'react-dom/client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MetricPoint {
  Date: string;
  Value: number;
  Unit: string;
}

interface MetricsData {
  [metricName: string]: MetricPoint[];
}

interface TableData {
  [key: string]: string | number;
}

interface BotMessage {
  sender: "user" | "bot";
  text: string;
  chartData?: MetricsData | null;
  tableData?: TableData[] | null;
  timestamp: number;
}

interface ChatWindowProps {
  chatHistory: BotMessage[];
  isTyping: boolean;
  height?: number;
  width?: number
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatHistory, isTyping, height, width }) => {

  const CiUserIcon = wrapIcon(CiUser);
  const currentUsers: any = useAppSelector(selectCommonConfig);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const location = useLocation();
  const pathname = location.pathname;

  const profileName = currentUsers.loginDetails.currentuserDetails.userName || "Not Found";
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setContainerWidth(width - 20);
    }
  }, [chatHistory, isTyping, width]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(width - 20);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);
  return (
    <div
      ref={containerRef}
      style={pathname.includes("/Analytics_AI") && height ? { height: `${height}px` } : {}}
      className={`px-1 py-4 overflow-auto  ${pathname.includes("Iac")
        ? "prompt_engine flex-grow-1"
        : pathname.includes("/Analytics_AI")
          ? ""
          : "tech_assist flex-grow-1"
        }`}
    >
      {chatHistory.map((msg, index) => (
        <div
          key={index}
          className={`d-flex  mb-2 align-items-center ${msg.sender === "user" ? "justify-content-end" : "justify-content-start"
            }`}
        >
          <div className="me-2">
            {msg.sender === "user" ? (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 align-self-start"
                style={{ width: "24px", height: "24px", background: "#e0e0e0", color: "#011A80", fontSize: "12px" }}
              >
                {profileName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            ) : (
              <div className="icon-circle-bg">
                <img
                  src={chatbotIcon}
                  alt="Bot"
                  style={{ width: "80%", height: "80%", objectFit: "contain" }}
                />
              </div>
            )}
          </div>
          <div
            className={`chat_window mb-1 ${msg.sender === "user" ? "chat_msg_box " : "chat_msg "
              }`}
            style={{
              maxWidth: "95%",

            }}
          >

           
            <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
          
    
          </div>

          {/* Charts Section */}
          {msg?.chartData?.analysis ? <FinopsChart title={String(msg.chartData.dimension)} period={String(msg?.chartData?.period)} currency={String(msg.chartData.currency)} data={msg.chartData.answer} tabData={String(msg.chartData.analysis)} containerWidth={containerWidth} /> : <ChatInBarChart chartData={msg.chartData} tabData={msg.tableData} containerWidth={containerWidth} />}
        </div>
      ))}

      {/* Typing Animation */}
      {isTyping && (
        <div className="fst-italic d-flex align-items-center">

          <ChatbotLoader />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;