"use client";

import logo from './logo.svg';
import * as React from 'react';

import { useState, useEffect } from 'react';
import './App.css';
import '@farcaster/auth-kit/styles.css';

import { TypeAnimation } from 'react-type-animation';
import Drawer from '@mui/joy/Drawer';
import Sheet from '@mui/joy/Sheet';
import Divider from '@mui/joy/Divider';




const AnimatedText = () => {
  return (
    <TypeAnimation
      sequence={[
        // Same substring at the start will only be typed out once, initially
        'Find Warpcast accounts to follow, and earn.',
        3000, // wait 1s before replacing "Mice" with "Hamsters"
        'Gain Warpcast followers to grow.',
        3000,
      ]}
      wrapper="span"
      speed={75}
      className="landingexplainer"
      repeat={Infinity}
    />
  );
};

function App() {
  const [open, setOpen] = React.useState(false);

  return (
          <div className="landing">
            <Drawer
        size="md"
        variant="plain"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'transparent',
              p: { md: 3, sm: 0 },
              boxShadow: 'none',
            },
          },
        }}
      >
        <Sheet
          sx={{
            borderRadius: 'md',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            overflowY: 'auto',
          }}
        >
          <h2>How does FollowCaster work?</h2>
          <Sheet variant="outlined" color="neutral" sx={{ p: 4 }}>
            1. Log in with your Warpcast account. Create a Coinbase Smart Wallet.
          </Sheet>
          <Sheet variant="outlined" color="neutral" sx={{ p: 4 }}>
            2. Discover Warpcast accounts. Earn $FOLLOW for each account you follow.
          </Sheet>
          <Sheet variant="outlined" color="neutral" sx={{ p: 4 }}>
            3. Promote your warpcast account for $FOLLOW. Watch your following grow.
          </Sheet>
          <Sheet variant="soft" sx={{ p: 4 }}>
            You can buy $FOLLOW on Uniswap to grow your account faster. And you can sell $FOLLOW to cash in your earnings.
          </Sheet>
        </Sheet>
      </Drawer>
            <div className="landingtitle"><span className="purple">F</span>OLLOWCASTER</div>
            <AnimatedText />
            <a href="https://followcaster.com/test" className="landingbutton">Try the beta!</a>
            <a href="https://onchain-summer.devfolio.co/" target="_blank"><div className="buildathon"><img width="24px" src="base.png"/>Onchain Summer Buildathon</div></a>
            <div className="howworks" onClick={() => setOpen(true)}>How does it work?</div>
          </div>
        )
}

export default App;
