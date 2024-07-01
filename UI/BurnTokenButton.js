import React, { useState, useEffect } from 'react';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import Web3 from 'web3';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';

const sdk = new CoinbaseWalletSDK({
  appName: 'FollowCaster',
  appLogoUrl: 'https://example.com/logo.png',
  chainIds: [8453]
});

const DEFAULT_ETH_JSONRPC_URL = 'https://few-holy-cloud.base-mainnet.quiknode.pro/540aed7fe1e954f46b2f8c28e723a35fa0c83b98';
const DEFAULT_CHAIN_ID = 8453;
const ethereum = sdk.makeWeb3Provider();
const web3 = new Web3(ethereum);

const BurnTokenButton = ({ tokens, address, fid, tokenamount, setRerender, SweetAlert, setDoType, setOpen, verificationdata, pitch}) => {
    

  const waitForTransactionReceipt = async (txHash, interval = 1000, retries = 10) => {
    for (let i = 0; i < retries; i++) {
      try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt) {
          return receipt;
        }
      } catch (error) {
        console.error(`Error fetching transaction receipt on attempt ${i + 1}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Transaction not found after multiple retries');
  };

  const burnTokens = async () => {
    console.log(address)
    if (!address) {
      console.error('Wallet not connected.');
      SweetAlert('Please link or create your wallet.')
      setOpen(true);
      return;
    }

    if(tokenamount == 0){
        SweetAlert('Please enter a valid amount.')
        return;
    }

    if(Number(tokenamount) > Number(tokens)){
        SweetAlert('You do not have enough tokens. Buy more or follow accounts to earn some.')
        setOpen(true);
        return;
    }

    const contractAddress = '0xe5f8241d62ff5040d4db632693f54d4bc5af0461';
    const amount = ethers.utils.parseUnits(tokenamount, 'ether'); // 1 token

    const contractABI = [
      {
        "inputs": [
          { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "receiveAndBurnTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    const contract = new web3.eth.Contract(contractABI, contractAddress);

    try {
      SweetAlert("Please wait while FollowCaster processes your request.")
      console.log('Estimating gas...');
      const gasEstimate = await contract.methods.receiveAndBurnTokens(amount.toString()).estimateGas({ from: address });
      console.log('Gas estimate:', gasEstimate);

      const gasPrice = await web3.eth.getGasPrice();
      console.log('Gas price:', gasPrice);

      const nonce = await web3.eth.getTransactionCount(address, 'latest');
      console.log('Nonce:', nonce);

      const txObject = {
        from: address,
        to: contractAddress,
        gas: web3.utils.toHex(gasEstimate),
        gasPrice: web3.utils.toHex(gasPrice),
        nonce: web3.utils.toHex(nonce),
        data: contract.methods.receiveAndBurnTokens(amount.toString()).encodeABI(),
      };

      console.log('Transaction Object:', txObject);

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txObject],
      });

      console.log('Transaction hash:', txHash);

      const receipt = await waitForTransactionReceipt(txHash);

      if (receipt.status) {
        console.log('Transaction was successful');

        await fetch('https://followerapi-9a70775ff765.herokuapp.com/create-campaign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            txHash,
            tokensBurned: ethers.utils.formatUnits(amount, 'ether'), // Number of tokens burned
            fid,
            verificationdata: verificationdata,
            pitch: pitch
          }),
        });
        SweetAlert("Campaign funding successful.")
    
        setTimeout(() => {
            setRerender((prev) => !prev);
            }, 1000);

      } else {
        console.log('Transaction failed');
        SweetAlert('Something went wrong.');
      }

    } catch (error) {
      console.error('Error burning tokens:', error);
      SweetAlert("Something went wrong.");
      // Log specific error details
      if (error.response) {
        console.error('Error response:', error.response);
      }
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
    }
  };

  return (
    <button onClick={burnTokens} className="getfollowedbutton">
      Gain followers
    </button>
  );
};

export default BurnTokenButton;
