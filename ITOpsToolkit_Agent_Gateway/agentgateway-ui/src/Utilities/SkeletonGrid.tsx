import React from "react";
import { Avatar, Box, Grid, Skeleton } from "@mui/material";

const SkeletonGrid = ({
  rows,
  columns,
  height,
  waveAnimation,
  variant,
  widthPercentage,
  progressLoader = true,
  param = false,
  myRequestSkelton = {"show" : false, "width" : 100, "height" : 100},
  onboardingSkelton = {"show" : false, "width" : 100, "height" : 100}
}) => {
  // Corrected conditional rendering using ternary operator
  return (
    <>
      {myRequestSkelton?.show ? (
        <span>
        <Skeleton animation="wave" className="w-100" /> 
        <Skeleton animation="wave" className="w-50" /> 
        <p className="d-flex align-items-center mt-1">
           <Skeleton animation="wave" className="w-25 m-2" />
           <Skeleton variant="circular" width={myRequestSkelton?.width} height={myRequestSkelton?.height}>
             <Avatar />
           </Skeleton>
           <Skeleton animation="wave" className="w-25 m-2" />
           <Skeleton variant="circular" width={myRequestSkelton?.width} height={myRequestSkelton?.height}>
             <Avatar />
           </Skeleton>
           <Skeleton animation="wave" className="w-25 m-2" />
           <Skeleton variant="circular" width={myRequestSkelton?.width} height={myRequestSkelton?.height}>
             <Avatar />
           </Skeleton>
           <Skeleton animation="wave" className="w-25 m-2" />
         </p>
       </span>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            height: height,
            padding: 3,
          }}
        >
          <Grid container spacing={2} justifyContent="space-between">
            {Array.from(new Array(rows)).map((_, rowIndex) => (
              <Grid
                container
                item
                xs={12}
                spacing={3}
                key={rowIndex}
                justifyContent="space-between"
              >
                {Array.from(new Array(columns)).map((_, colIndex) => (
                  <Grid item xs={Math.floor(12 / columns)} key={colIndex}>
                    <Skeleton
                      animation={waveAnimation ? "wave" : false}
                      variant={variant}
                      height={100}
                      sx={{ width: widthPercentage }}
                    />
                    {progressLoader ? (
                      <>
                        <Skeleton animation={waveAnimation ? "wave" : false} />
                        <Skeleton
                          animation={waveAnimation ? "wave" : false}
                          width="60%"
                        />
                      </>
                    ) : (
                      <></>
                    )}
                  </Grid>
                ))}
              </Grid>
            ))}
            {param && (
              <Skeleton
                animation={waveAnimation ? "wave" : false}
                variant={variant}
                height={150}
                sx={{ width: widthPercentage }}
              />
            )}
            {

            }
          </Grid>
        </Box>
      )}
    </>
  );
};

SkeletonGrid.defaultProps = {
  rows: 3,
  columns: 3,
  height: "100vh",
  waveAnimation: true,
  variant: "rectangular",
  widthPercentage: "100%",
};

export default SkeletonGrid;
