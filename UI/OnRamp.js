import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);

  const abi = [
    { "inputs": [{ "internalType": "contract ISwapRouter", "name": "_swapRouter", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [{ "internalType": "uint256", "name": "ethAmount", "type": "uint256" }], "name": "convertEthToWeth", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "wethAmount", "type": "uint256" }], "name": "executeSwap", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "stateMutability": "payable", "type": "receive" },
    { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
  ];

  const contractAddress = "0x0c6c0e337ff298bc7a2577de0dc08b90a1d8c4d6";

  useEffect(() => {
    const init = async () => {
      const sdk = new CoinbaseWalletSDK({
        appName: 'FollowCaster',
        appChainIds: [8453],
      });

      // Create provider
      const provider = sdk.makeWeb3Provider('https://few-holy-cloud.base-mainnet.quiknode.pro/540aed7fe1e954f46b2f8c28e723a35fa0c83b98', 8453, {options: 'smartWalletOnly'});
      const web3Instance = new Web3(provider);

      const accounts = await web3Instance.eth.requestAccounts();
      setAccount(accounts[0]);
      setWeb3(web3Instance);
    };

    init();
  }, []);

  const convertEthToWeth = async (ethAmount) => {
    if (!web3 || !account) return;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const ethAmountInWei = web3.utils.toWei(ethAmount.toString(), 'ether');
    const data = contract.methods.convertEthToWeth(ethAmountInWei).encodeABI();

    const gasPrice = await web3.eth.getGasPrice();
    const tx = {
      from: account,
      to: contractAddress,
      value: ethAmountInWei,
      gas: 200000,
      gasPrice: gasPrice,
      data: data
    };

    try {
      const txHash = await web3.eth.sendTransaction(tx);
      console.log('Convert ETH to WETH transaction hash:', txHash.transactionHash);
    } catch (error) {
      console.error('Error converting ETH to WETH:', error);
    }
  };

  const executeSwap = async (wethAmount) => {
    if (!web3 || !account) return;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const wethAmountInWei = web3.utils.toWei(wethAmount.toString(), 'ether');
    const data = contract.methods.executeSwap(wethAmountInWei).encodeABI();

    const gasPrice = await web3.eth.getGasPrice();
    const tx = {
      from: account,
      to: contractAddress,
      gas: 2000000,
      gasPrice: gasPrice,
      data: data
    };

    try {
      const txHash = await web3.eth.sendTransaction(tx);
      console.log('Swap transaction hash:', txHash.transactionHash);
    } catch (error) {
      console.error('Error executing swap:', error);
    }
  };

  const handleButtonClick = async () => {
    try {
      // Step 1: Convert ETH to WETH
      await convertEthToWeth(0.0001); // Convert 0.0001 ETH to WETH
      console.log("Converted ETH to WETH");

      // Step 2: Execute swap
      await executeSwap(0.0001); // Swap 0.0001 WETH to USDC
      console.log("Executed swap from WETH to USDC");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <button onClick={handleButtonClick}>Convert ETH to WETH and Swap</button>
      <p>Account: {account}</p>
    </div>
  );
};

export default App;
