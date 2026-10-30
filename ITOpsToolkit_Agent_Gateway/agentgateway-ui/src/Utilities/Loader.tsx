import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

interface Props {
  isLoading: boolean;
}
export const Loader = ({ isLoading, load }) => {
  return (
    <>
      {isLoading ? (
        //  <Box className= {Api.getPopUpData() ? 'loader1' : "loader"}>
        <Box className={load ? "loader1" : "loader"} bgcolor="rgba(0,0,0,0.6)">
          {/* <CircularProgress
            size={70}
            thickness={2}
            style={{ color: "#fff", animation: "spin 1s linear infinite" }}
          /> */}
         <CircularProgress
            size={60}
            thickness={2}
            sx={{
              color: "#ffffff",
              animation: "spin 1s linear infinite",
            }}
          />
        </Box>
      ) : null}
    </>
  );
};
