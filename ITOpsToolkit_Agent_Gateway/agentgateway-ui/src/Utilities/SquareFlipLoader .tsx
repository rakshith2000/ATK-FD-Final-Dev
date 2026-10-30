import React from "react";

const SquareFlipLoader: React.FC = () => {
  return (
   <div className="quantum-loader">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }}></div>
      ))}
    </div>
  );
};

export default SquareFlipLoader;
