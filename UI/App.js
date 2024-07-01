"use client";

import logo from './logo.svg';
import * as React from 'react';

import { useState, useEffect } from 'react';
import './App.css';
import '@farcaster/auth-kit/styles.css';
import { AuthKitProvider } from '@farcaster/auth-kit';
import { SignInButton } from '@farcaster/auth-kit';
import Swal from 'sweetalert2';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import { TypeAnimation } from 'react-type-animation';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk'
import { BlueCreateWalletButton } from './BlueCreateWalletButton';
import Drawer from '@mui/joy/Drawer';
import Sheet from '@mui/joy/Sheet';
import Divider from '@mui/joy/Divider';
import {Web3} from 'web3'
import DoModal from './DoModal';
import BurnTokenButton from './BurnTokenButton';
import Modal from '@mui/joy/Modal';

import SwapRouter from './SwapRouter';

if (typeof window !== "undefined") {
  // @ts-ignore
  window.Browser = {
    T: () => {},
  };
}


const sdk = new CoinbaseWalletSDK({
  appName: 'FollowCaster',
  appChainIds: [8453]
});

// Create provider
const provider = sdk.makeWeb3Provider({options: 'smartWalletOnly'});
// Use provider


const web3 = new Web3(provider)


const SweetAlert = (text) => {
  const Toast = Swal.mixin({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 6000,
    timerProgressBar: true,
    onOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
  Toast.fire({
    title: text,
  });
};

const AnimatedText = () => {
  return (
    <TypeAnimation
      sequence={[
        // Same substring at the start will only be typed out once, initially
        'Follow Farcast accounts to earn.',
        3000, // wait 1s before replacing "Mice" with "Hamsters"
        'Gain Farcast followers to grow.',
        3000,
      ]}
      wrapper="span"
      speed={75}
      className="landingexplainer"
      repeat={Infinity}
    />
  );
};

const config = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: 'followcaster.com',
  siweUri: 'https://followcaster.com',
};

function App() {
  const [username, setUsername] = useState('');
  const [fid, setFid] = useState('');
  const [followers, setFollowers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [genre, setGenre] = useState('Gaming');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [view, setView] = useState('landing'); // View state: 'landing', 'following', 'getFollowers'
  const [rerender, setRerender] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [address, setAddress] = useState('');
  const [noTokensOpen, setNoTokensOpen] = useState(false);
  const [dotype, setDoType] = useState('');
  const [coinbaseExplanationOpen, setCoinbaseExplanationOpen] = useState(false);
  const [pitch, setPitch] = useState('No pitch');
  const [searchInput, setSearchInput] = useState('');

  const [open, setOpen] = React.useState(false);
  const [followersToGet, setFollowersToGet] = useState(0);
  const [verificationdata, setVerificationData] = useState({})

  useEffect(() => {
    const fid = localStorage.getItem("fid")
    const message = localStorage.getItem("message")
    const nonce = localStorage.getItem("nonce")
    const signature = localStorage.getItem("signature")
    const username = localStorage.getItem("username")
  

    if(fid && message && nonce && signature && username){ 
      setUsername(username)
      setFid(fid)
      setVerificationData({ message: message, nonce: nonce, signature: signature, domain: "followcaster.com"});
      setView('following');
    }
  }, [])
  const claimReward = async (buyerFid) => {
    if(!address){
      SweetAlert('Please link your wallet to claim rewards.');
      setOpen(true);
      return;
    }
    try {
      SweetAlert("Claiming rewards...")
      const response = await fetch(`https://followerapi-9a70775ff765.herokuapp.com/claim-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userFid: fid, buyerFid, address: address, verificationdata: verificationdata}) // Assuming fid is available in your component's state
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // Handle successful reward claim logic here
        SweetAlert(result.message);
        setRerender((prev) => prev + 1);
      } else {
        SweetAlert(result.message);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      SweetAlert.fire('Error', 'An error occurred while claiming the reward.', 'error');
    }
  };
  


  const fetchtokens = async () => {
    try {
      console.log(address, fid)
      const response = await fetch(`https://followerapi-9a70775ff765.herokuapp.com/tokens?address=${address}&fid=${fid}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tokens');
      }
      const data = await response.json();
      const tokenBalance = Number(data?.token_balance);
      setTokens(Number.isNaN(tokenBalance) ? 0 : tokenBalance.toFixed(0));
      setFollowersToGet(data?.followers_to_get || 0);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      SweetAlert(error.message);
    }
  };

  useEffect(() => {
    console.log(verificationdata)
    if (address) {
      fetchtokens();
    }
  }, [address, rerender]);

  useEffect(() => {
    setRerender((prev) => prev + 1);
  }, [view])

  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const response = await fetch('https://followerapi-9a70775ff765.herokuapp.com/buyers');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch buyers');
        }
        const data = await response.json();
        if (!data) {
          return;
        }
        
        if (Array.isArray(data)) {
          data.sort((a, b) => (b.rewardedFids?.length || 0) - (a.rewardedFids?.length || 0));
          setBuyers(data);
        } else {
          console.error('Expected data to be an array', data);
        }
      } catch (error) {
        console.error("Error fetching buyers:", error);
        SweetAlert(error.message);
      }
    };
    fetchBuyers();
  }, [rerender]);

  const fetchBuyersSearch = async () => {
    try {
      const response = await fetch('https://followerapi-9a70775ff765.herokuapp.com/find-similar-pitches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userInterest: searchInput })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch buyers');
      }
  
      const data = await response.json();
      setBuyers(data.results); // Assuming the results are set in the state 'buyers'
      SweetAlert("AI search successful.")
    } catch (error) {
      console.error("Error fetching buyers:", error);
      SweetAlert("Something went wrong.");
    }
  };
  

  const handleGetFollowed = async () => {
    if (!fid) {
      SweetAlert('Please sign in first.');
      return;
    }
    if (tokens < amount) {
      setNoTokensOpen(true);
      return;
    }


      if (typeof window.ethereum !== 'undefined') {
        try {
          // Request user accounts
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const account = accounts[0];
          console.log(`User's address is ${account}`);
          console.log(address)

          // Define the token contract ABI and address
          const erc20Abi = [
            {
              constant: false,
              inputs: [
                { name: '_to', type: 'address' },
                { name: '_value', type: 'uint256' }
              ],
              name: 'transfer',
              outputs: [{ name: '', type: 'bool' }],
              type: 'function'
            }
          ];
          const tokenContractAddress = '0x9bd7764375c2AC77F767Ab22b38172E57D6B748A'; // Replace with your token contract address
          const recipientAddress = '0x9bd7764375c2AC77F767Ab22b38172E57D6B748A'; // Replace with actual recipient address
          const amountToSend = web3.utils.toWei(amount, 'ether'); // Adjust the amount as needed

          // Create contract instance
          const contract = new web3.eth.Contract(erc20Abi, tokenContractAddress);

          // Estimate gas
          const gas = await contract.methods.transfer(recipientAddress, amountToSend).estimateGas({ from: account });
          console.log('Gas estimate:', gas);

          // Get the current gas price
          const gasPrice = await web3.eth.getGasPrice();
          console.log('Current gas price:', gasPrice);

          // Send the transaction
          contract.methods.transfer(recipientAddress, amountToSend).send({
            from: address,
            gas: gas,
            gasPrice: gasPrice
          })
            .on('transactionHash', (hash) => {
              console.log('Transaction hash:', hash);
              SweetAlert(`Transaction sent! Hash: ${hash}`);
            })
            .on('receipt', (receipt) => {
              console.log('Transaction receipt:', receipt);
              SweetAlert('Transaction successful!');
              setTimeout(() => {
                fetchtokens();
              }, 5000);
            })
            .on('error', (error) => {
              console.error('Error during token transfer:', error);
              SweetAlert(`Error during token transfer: ${error.message}`);
            });
        } catch (error) {
          console.error('Error requesting accounts or performing token transfer:', error);
          SweetAlert(`Error: ${error.message}`);
        }
      } else {
        console.log('Ethereum provider is not available. Please install MetaMask or Coinbase Wallet.');
        SweetAlert('Ethereum provider is not available. Please install MetaMask or Coinbase Wallet.');
      }


{/*
    try {
      const response = await fetch('https://followerapi-9a70775ff765.herokuapp.com/getfollowed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fid: fid, number_of_follows: amount, genre, address })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase follows');
      }
      SweetAlert(data.message || 'Follow purchase successful.');
    } catch (error) {
      console.error("Error purchasing follows:", error);
      SweetAlert(error.message);
    }
    */}
  };

  const handleFollow = async (toFollowFid) => {
    if (!fid) {
      SweetAlert('Please sign in first.');
      return;
    }

    try {
      const response = await fetch('https://followerapi-9a70775ff765.herokuapp.com/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ my_fid: fid.toString(), to_follow_fid: toFollowFid })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to follow user');
      }
      SweetAlert(data.message || 'Follow action successful.');
    } catch (error) {
      console.error("Error following user:", error);
      SweetAlert(error.message);
    }
  };

  const handleSuccess = async (address) => {
    console.log('address', address)
    {/*const response = await fetch('https://followerapi-9a70775ff765.herokuapp.com/setaddress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ my_fid: fid.toString(), address: address })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to link wallet.');
    }
    else{
      SweetAlert('Wallet linked successfully.');
    }
    */}
    setAddress(address)
  }

  const handleSelectChange = (event, newValue) => {
    setGenre(newValue);
  }

  return (
    <>
      <AuthKitProvider config={config}>
        {fid ? (
          <>
            <Drawer
              size="md"
              variant="plain"
              open={open}
              onClose={() => setOpen(false)}
              slotProps={{
                content: {
                  sx: {
                    bgcolor: "transparent",
                    p: { md: 3, sm: 0 },
                    boxShadow: "none",
                    width: "auto",
                    maxWidth: "85vw",
                  },
                },
              }}
            >
              <Sheet
                sx={{
                  borderRadius: "md",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  height: "100%",
                  overflowX: "hidden",
                  overflowY: "auto",
                }}
              >
                <div className="drawerbalance">
                  <img src="ficon.png" height="72px" />
                  <div style={{ marginBottom: "-20px" }}>Balance</div>
                  <div className="drawerbalancetext">{tokens} Follow</div>
                </div>
                <Divider />
                <Sheet variant="outlined" color="neutral" sx={{ p: 2 }}>
                  <b>Link Warpcast to verify yourself</b>
                  <div>
                    Warpcast user <b>{username}</b> successfully linked!
                  </div>
                </Sheet>
                <Sheet variant="outlined" color="neutral" sx={{ p: 2 }}>
                  <b>Link Coinbase Wallet to earn and spend</b>
                  <br />
                  {address ? <div>Coinbase Smart Wallet linked!</div> : null}
                  {address ? (
                    <div className="draweraddress">{address}</div>
                  ) : (
                    <BlueCreateWalletButton
                      handleSuccess={handleSuccess}
                      sdk={sdk}
                      provider={provider}
                    />
                  )}
                </Sheet>
                <Sheet variant="outlined" color="neutral" sx={{ p: 2 }}>
                  <b>Add ETH to your Smart Wallet</b>
                  <div>
                    <a
                      style={{ textDecoration: "none" }}
                      href={`https://pay.coinbase.com/buy/select-asset?appId=b2f0a721-6737-4735-bb10-7827098e8794&destinationWallets=[{"address":"${address}","blockchains":["base"]}]`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="tradeCoinbase">
                        {" "}
                        <img
                          src="https://seeklogo.com/images/C/coinbase-coin-logo-C86F46D7B8-seeklogo.com.png"
                          width="24px"
                          height="24px"
                        />
                        Buy on Coinbase
                      </div>
                    </a>
                  </div>
                </Sheet>
                <Sheet variant="outlined" color="neutral" sx={{ p: 2 }}>
                  <b>Get more FOLLOW tokens</b>
                  <div>
                    <a
                      style={{ textDecoration: "none" }}
                      href={`https://app.uniswap.org/swap?exactField=input&exactAmount=10&inputCurrency=0x4200000000000000000000000000000000000006&outputCurrency=0xe5f8241D62ff5040D4DB632693f54d4BC5AF0461`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="tradeUniswap">
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Uniswap_Logo.svg/2051px-Uniswap_Logo.svg.png"
                          width="24px"
                          height="24px"
                        />{" "}
                        Trade on Uniswap
                      </div>
                    </a>
                  </div>
                  <div
                    onClick={() => setCoinbaseExplanationOpen(true)}
                    className="tradeCoinbase"
                  >
                    {" "}
                    <img
                      src="https://seeklogo.com/images/C/coinbase-coin-logo-C86F46D7B8-seeklogo.com.png"
                      width="24px"
                      height="24px"
                    />
                    Swap via coinbase smart wallet
                  </div>
                </Sheet>
              </Sheet>
            </Drawer>
            <Modal
              aria-labelledby="modal-title"
              aria-describedby="modal-desc"
              open={coinbaseExplanationOpen}
              onClose={() => setCoinbaseExplanationOpen(false)}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Sheet
                variant="outlined"
                sx={{
                  maxWidth: 500,
                  borderRadius: "md",
                  p: 3,
                  boxShadow: "lg",
                }}
              >
                <ol>
                  <li>Open your Coinbase Smart Wallet</li>
                  <li>Click on the "Swap" tab</li>
                  <li>Choose "To" asset.</li>
                  <li>Search for "FollowContract", ending in 0461.</li>
                  <li>Swap.</li>
                </ol>
              </Sheet>
            </Modal>
            <div className="navBar">
              <div className="balance" onClick={() => setOpen(true)}>
                <img src="ficon.png" width="32px" /> {tokens}
              </div>
              <div
                className={
                  view == "following" ? "selectedNav itemNav" : "itemNav"
                }
                onClick={() => setView("following")}
              >
                Follow and Earn
              </div>
              <div
                className={
                  view == "getFollowers" ? "selectedNav itemNav" : "itemNav"
                }
                onClick={() => setView("getFollowers")}
              >
                Gain Followers
              </div>
            </div>
            {view === "following" ? (
              <>
              <div className="buyercards" key={rerender + 2}>
              <div className="fancySearch">
              <Input sx={{width:"100%"}} onChange={(e) => setSearchInput(e.target.value)} placeholder="What are you interested in?" />
              <button className="fancySearchButton" onClick={() => fetchBuyersSearch()}>AI Search</button>
              </div>
                {buyers.length > 0 ? (
                  buyers.map((buyer) => (
                    <div key={buyer.fid} className="buyercard">
                      <div className="buyercardname">{buyer?.username}</div>
                      <div className="followersGained">Followers gained: {buyer?.rewardedFids?.length || 0}</div>
                      <div className="buyercardbio">
                        {buyer?.bio ? buyer?.bio : "No bio."}
                      </div>
                      <div className="buyercardbuttons">

                        {buyer?.rewardedFids?.length > 0 &&
                        buyer?.rewardedFids?.includes(fid) ? (
                          <div
                            className="buyercardfollowclaimed"
                            onClick={() => SweetAlert("You have already been rewarded for following this account.")}
                          >
                            Reward claimed
                          </div>
                        ) : (
                          <>
                                                  <a
                        href={"https://warpcast.com/" + buyer.username}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none" }}
                      >
                        <div className="buyercardfollow">Follow</div>
                      </a>
                          <div
                          className="buyercardfollow"
                          onClick={() => claimReward(buyer?.fid)}
                        >
                          Claim reward
                        </div>

                                              </>

                        
                        )}{" "}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Loading accounts to follow...</p>
                )}
              </div>
              </>
            ) : (
              <div className="getfollowers" key={rerender + 1}>
                <div className="getfollowerscard">
                  <div
                    className="getfollowerstitle"
                    style={{ marginBottom: "20px" }}
                  >
                    Start your campaign
                  </div>
                  <div className="getfollowersdescription">
                    How many followers do you want? 1 token for 1 follower.
                  </div>
                  <div className="getfollowersdescription">
                    You already have <b>{followersToGet} followers</b> in your
                    campaign.
                  </div>
                  <Input
                    sx={{ marginTop: "10px", width: "100%" }}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    endDecorator={
                      <div
                        style={{
                          padding: "10px",
                          fontSize: "14px",
                          lineHeight: "15px",
                          borderLeft: "1px solid #cdd7e1",
                        }}
                      >
                        <span>Balance</span> <br />
                        <b>{tokens} Tokens</b>
                      </div>
                    }
                  />

                  <BurnTokenButton
                    fid={fid}
                    tokens={tokens}
                    tokenamount={amount.toString()}
                    address={address}
                    setRerender={setRerender}
                    SweetAlert={SweetAlert}
                    setDoType={setDoType}
                    setOpen={setOpen}
                    verificationdata={verificationdata}
                    pitch={pitch}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="landing" key={rerender + 2}>
            <div className="landingtitle">
              <span className="purple">F</span>OLLOWCASTER
            </div>
            <AnimatedText />

            <SignInButton
              onSuccess={({ fid, username, message, nonce, signature }) => {
                setUsername(username);
                setFid(fid.toString());
                setView("following"); // Set the initial view after signing in
                console.log({fid, username, message, nonce, signature})
                setVerificationData({
                  message: message,
                  nonce: nonce,
                  signature: signature,
                  domain: "followcaster.com",
                });
                let data = JSON.stringify({
                  fid: fid,
                  username: username,
                  message: message,
                  nonce: nonce,
                  signature: signature,
                  domain: "followcaster.com",
                });
                localStorage.setItem("fid", fid);
                localStorage.setItem("username", username);
                localStorage.setItem("message", message);
                localStorage.setItem("nonce", nonce);
                localStorage.setItem("signature", signature);
              }}
            />
          </div>
        )}
      </AuthKitProvider>
      <DoModal
        setNoTokensOpen={setNoTokensOpen}
        noTokensOpen={noTokensOpen}
        dotype={dotype}
      />
    </>
  );
}

export default App;
