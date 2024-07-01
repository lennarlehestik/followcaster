import React, { useCallback } from 'react';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import Web3 from 'web3';
import Swal from 'sweetalert2';
import './App.css';

const sdk = new CoinbaseWalletSDK({
  appName: 'FollowCaster',
  appLogoUrl: 'https://i.ibb.co/YPyXgTS/Frame-54-1.png',
  chainIds: [8453]
});

const DEFAULT_ETH_JSONRPC_URL = 'https://few-holy-cloud.base-mainnet.quiknode.pro/540aed7fe1e954f46b2f8c28e723a35fa0c83b98';
const DEFAULT_CHAIN_ID = 8453;
const ethereum = sdk.makeWeb3Provider();
const web3 = new Web3(ethereum);

export function BlueCreateWalletButton({ handleSuccess, handleError }) {
  const createWallet = useCallback(async () => {
    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      const address = accounts[0];

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: Web3.utils.toHex(DEFAULT_CHAIN_ID) }],
      });

      handleSuccess(address);
    } catch (error) {
      console.error('Error connecting wallet or switching network:', error);
      Swal.fire('Error', 'Failed to connect wallet or switch network. Please try again.', 'error');
      handleError(error);
    }
  }, [handleSuccess, handleError]);

  return (
    <button className="coinbasebutton" onClick={createWallet}>
      Connect Smart Wallet
    </button>
  );
}
