import React from "react";

const LogoBorderLoader = () => {
  return (
    <>
      <div className="logo-loader-wrapper">
        <div className="logo-loader"></div>
      </div>

      <style>{`
        .logo-loader-wrapper {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
        }

        .logo-loader {
          width: 80px;  /* smaller size */
          height: 80px;
          -webkit-mask: url("https://res.cloudinary.com/dvid0uzwo/image/upload/v1758687457/my_project/rwo0kukija1ny3dxq2am.png") no-repeat center/contain;
          mask: url("https://res.cloudinary.com/dvid0uzwo/image/upload/v1758687457/my_project/rwo0kukija1ny3dxq2am.png") no-repeat center/contain;
          background: none;
          position: relative;
        }

        .logo-loader::before {
          content: "";
          position: absolute;
          inset: 0;
          -webkit-mask: url("https://res.cloudinary.com/dvid0uzwo/image/upload/v1758687457/my_project/rwo0kukija1ny3dxq2am.png") no-repeat center/contain;
          mask: url("https://res.cloudinary.com/dvid0uzwo/image/upload/v1758687457/my_project/rwo0kukija1ny3dxq2am.png") no-repeat center/contain;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 20%,
            rgba(255,255,255,1) 50%,
            rgba(255,255,255,0) 80%
          );
          background-size: 200% 100%;
          animation: border-shine 4s infinite linear; /* slower speed */
        }

        @keyframes border-shine {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default LogoBorderLoader;
