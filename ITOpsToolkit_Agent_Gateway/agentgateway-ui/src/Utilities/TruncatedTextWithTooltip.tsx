// components/TruncatedTextWithTooltip.jsx
import React from 'react';
import { Tooltip, Typography } from '@mui/material';

interface TruncatedTextWithTooltipProps {
  text?: string;
  maxLength?: number;
  placement?: "top" | "bottom-end" | "bottom-start" | "bottom" | "left-end" | "left-start" | "left" | "right-end" | "right-start" | "right" | "top-end" | "top-start";
  followCursor?: boolean;
  customClass?: string;
}

const TruncatedTextWithTooltip: React.FC<TruncatedTextWithTooltipProps> = ({ text, maxLength = 50, placement = "top", followCursor = true, customClass }) => {
  const needsTruncation = text && text.length > maxLength;
  const truncatedText = needsTruncation ? `${text.substring(0, maxLength)}...` : text;

  // Render the component
  return (
    <>
      {needsTruncation ? (
        <Tooltip
          title={text} // Full text for the tooltip
          placement={placement}
          arrow={true} // Always show arrow for consistency
          followCursor={followCursor}
        >
          {/* Typography component to style the text and apply truncation CSS */}
          <Typography component="span" variant="body2"   className={`${customClass} truncate-text-single-line cursor-pointer`}>
            {truncatedText}
          </Typography>
        </Tooltip>
      ) : (
        // If no truncation is needed, just render the Typography without a Tooltip
        <Typography component="span" variant="body2">
          {text}
        </Typography>
      )}
    </>
  );
};

export default TruncatedTextWithTooltip;