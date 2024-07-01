const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceKey.json');
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const { createAppClient, viemConnector } = require("@farcaster/auth-client");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: "",
});

// Set up the Web3 provider
const web3 = new Web3(''); // Use your own Infura project ID
const providerURL = ""; // Use appropriate network and provider
const privateKey = ""; // Replace with your private key
const contractAddress = "";
const contractABI = [
  "function mint(address to, uint256 amount) public",
  // Add other functions you want to interact with if necessary
];
// ERC20 Token ABI (Application Binary Interface)
const tokenABI = [
  // Only the part of ABI needed for balanceOf function
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  }
];

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const port = 5000;

const API_KEY = '';

// Use CORS middleware
app.use(cors(
    {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'https://lyricgenerator-15905.web.app', 'https://followcaster.com', 'https://enshrined-immense-rat.glitch.me'],
    }
));

app.use(express.json());

async function verifyFarcasterSignature(data) {
  const { message, signature, domain, nonce } = data;

  try {
    const appClient = createAppClient({
      ethereum: viemConnector(),
    });

    console.log({
        message,
        signature,
        domain,
        nonce,
      })

    const verifyResponse = await appClient.verifySignInMessage({
      message,
      signature,
      domain,
      nonce,
    });

    return verifyResponse.success;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}


const fetchTokenBalance = async (address) =>{
  const tokenContract = "0xe5f8241d62ff5040d4db632693f54d4bc5af0461" 
  try {
    // Create a new contract instance
    const contract = new web3.eth.Contract(tokenABI, tokenContract);
  
    // Call the balanceOf function
    const balance = await contract.methods.balanceOf(address).call();
    const balanceString = web3.utils.fromWei(balance, 'ether');

  
    // Send the balance as response
    console.log({ balance: balanceString});
    return balanceString
  } catch (error) {
    console.error(error);
  }
  }

const fetchfollowers = async (fid) => {
  const url = `https://build.far.quest/farcaster/v2/followers?fid=${fid}`;
  const options = {
    method: 'GET',
    headers: { accept: 'application/json', 'API-KEY': API_KEY }
  };
  try {
    const res = await fetch(url, options);
    const json = await res.json();
    const followerfids = json?.result?.users?.map(user => user.fid);
    return followerfids;
  } catch (err) {
    console.error('Error fetching followers from Farcaster API:', err);
    throw err;
  }
};

async function mintTokens(recipientAddress, mintAmount) {
  console.log(recipientAddress);
  const provider = new ethers.providers.JsonRpcProvider(providerURL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  try {
      const gasPrice = await provider.getGasPrice();
      console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

      const tx = await contract.mint(recipientAddress, mintAmount, {
          gasPrice: gasPrice
      });
      console.log("Transaction sent:", tx.hash);

      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      return receipt;
  } catch (error) {
      console.error("Error minting tokens:", error);
      throw error;
  }
}

app.post('/claim-reward', async (req, res) => {
  const { userFid, buyerFid, address, verificationdata} = req.body;
  const verified = await verifyFarcasterSignature(verificationdata)

  if (!verified) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  if (!userFid || !buyerFid) {
    return res.status(400).json({ success: false, message: 'userFid and buyerFid are required' });
  }

  try {
    // Fetch followers of the buyerFid
    const url = `https://build.far.quest/farcaster/v2/followers?fid=${buyerFid}`;
    const options = {
      method: 'GET',
      headers: { accept: 'application/json', 'API-KEY': API_KEY }
    };
    const fetchResponse = await fetch(url, options);
    const json = await fetchResponse.json();
    const followerFids = json?.result?.users?.map(user => user.fid);

    const isFollowing = followerFids.includes(userFid);

    if (!isFollowing) {
      return res.status(400).json({ success: false, message: 'You must follow the buyer to claim the reward.' });
    }

    // Check buyer document
    const buyerRef = db.collection('buyers').doc(buyerFid);
    const buyerDoc = await buyerRef.get();

    if (!buyerDoc.exists) {
      return res.status(404).json({ success: false, message: 'Buyer not found' });
    }

    const buyerData = buyerDoc.data();
    const rewardedFids = buyerData.rewardedFids || [];
    const followersToGet = buyerData.followers_to_get;

    if (followersToGet <= 0) {
      return res.status(400).json({ success: false, message: 'Campaign has just expired.' });
    }

    if (rewardedFids.includes(userFid)) {
      return res.status(400).json({ success: false, message: 'You have already claimed the reward for following this user.' });
    }

    const mintAmount = ethers.utils.parseUnits("1", 18);

    const receipt = await mintTokens(address, mintAmount);

    // If minting is successful, update the buyer's document
    rewardedFids.push(userFid);
    await buyerRef.update({ rewardedFids, followers_to_get: followersToGet - 1 });

    res.json({ success: true, message: 'You have successfully claimed your reward!', receipt });
  } catch (error) {
    console.error('Error claiming reward:', error.message);
    res.status(500).json({ success: false, message: 'An error occurred while claiming the reward.' });
  }
});




app.get('/followers', async (req, res) => {
  const { fid } = req.query;

  if (!fid) {
    return res.status(400).json({ error: 'fid is required' });
  }

  try {
    const followers = await fetchfollowers(fid);
    res.json(followers);
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'An error occurred while fetching followers' });
  }
});

app.post('/getfollowed', async (req, res) => {
    const { fid, number_of_follows, genre } = req.body;
  
    if (!fid || !number_of_follows || !genre) {
      return res.status(400).json({ error: 'fid, number_of_follows, and genre are required' });
    }
  
    try {
      if (!fid.trim()) {
        throw new Error('Invalid fid');
      }
  
      const userRef = db.collection('users').doc(fid);
      const userDoc = await userRef.get();
  
      if (!userDoc.exists) {
        console.error(`User with fid ${fid} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
  
      const userData = userDoc.data();
      if (!userData.token_balance) {
        console.error(`User with fid ${fid} has no token_balance field`);
        return res.status(400).json({ error: "You don't have enough tokens." });
      }
  
      if (userData.token_balance < number_of_follows) {
        console.error(`User with fid ${fid} does not have enough tokens`);
        return res.status(400).json({ error: 'Not enough tokens' });
      }
  
      // Deduct tokens
      await userRef.update({
        token_balance: admin.firestore.FieldValue.increment(-number_of_follows)
      });
  
      const url = `https://build.far.quest/farcaster/v2/user?fid=${fid}`;
      const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'API-KEY': API_KEY }
      };
      const fetchResponse = await fetch(url, options); // Rename to avoid conflict
      const json = await fetchResponse.json();
      const username = json?.result?.user?.username;
  
      // Update buyers collection
      const buyerRef = db.collection('buyers').doc(fid);
      await buyerRef.set({
        followers_to_get: Number(number_of_follows).toFixed(0),
        genre: genre,
        username: username
      }, { merge: true });
  
      res.json({ message: 'Follow purchase successful' });
    } catch (error) {
      console.error('Error handling follow purchase:', error.message);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    }
  });


  app.post('/create-campaign', async (req, res) => {
    const { txHash, tokensBurned, fid, verificationdata, pitch} = req.body;
    const verified = await verifyFarcasterSignature(verificationdata)

    if (!verified) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

  
    if (!txHash || !tokensBurned || !fid) {
      return res.status(400).json({ error: 'Missing required data' });
    }
  
    try {
      // Fetch username from Farcaster
      const url = `https://build.far.quest/farcaster/v2/user?fid=${fid}`;
      const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'API-KEY': API_KEY }
      };
      const fetchResponse = await fetch(url, options);
      const json = await fetchResponse.json();
      const username = json?.result?.user?.username;
  
      if (!username) {
        throw new Error('Failed to fetch username from Farcaster');
      }
  
      // Update buyers collection
      const buyerRef = db.collection('buyers').doc(fid);
      const buyerDoc = await buyerRef.get();
      let currentFollowersToGet = 0;
  
      if (buyerDoc.exists) {
        const buyerData = buyerDoc.data();
        currentFollowersToGet = buyerData.followers_to_get || 0;
      }
      
      console.log('Current followers to get:', currentFollowersToGet)
      console.log('Tokens burned:', tokensBurned)
      const newFollowersToGet = currentFollowersToGet + Number(tokensBurned);
      console.log('New followers to get:', newFollowersToGet)
      
      await buyerRef.set({
        followers_to_get: newFollowersToGet,
        genre: 'gaming',
        username: username,
        pitch: pitch || ""
      }, { merge: true });
  
      res.json({ message: 'Campaign created successfully' });
    } catch (error) {
      console.error('Error creating campaign:', error.message);
      res.status(500).json({ error: 'An error occurred while creating the campaign' });
    }
  });
  
app.post('/follow', async (req, res) => {
  const { my_fid, to_follow_fid } = req.body;
  console.log('Attempting to follow:', my_fid, to_follow_fid);

  if (!my_fid || !to_follow_fid) {
    return res.status(400).json({ error: 'my_fid and to_follow_fid are required' });
  }

  try {
    // Fetch followers from Farcaster API
    const followers = await fetchfollowers(to_follow_fid);

    if (followers.includes(my_fid)) {
      const myUserRef = db.collection('users').doc(my_fid);
      await myUserRef.update({
        token_balance: admin.firestore.FieldValue.increment(1)
      });

      res.json({ message: 'Token awarded' });
    } else {
      console.error(`User ${my_fid} is not following ${to_follow_fid}`);
      res.status(400).json({ error: 'You are not following this user' });
    }
  } catch (error) {
    console.error('Error handling follow operation:', error.message);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Function to fetch user data (bios) from the API
async function fetchUsers(fids) {
  const response = await fetch(`${API_URL}?fids=${fids.join('%2C')}`, {
    method: 'GET',
    headers: {
      'API-KEY': API_KEY,
      'accept': 'application/json'
    }
  });
  const data = await response.json();
  return data.result.users.map(user => ({
    fid: user.fid,
    bio: user.bio.text // Ensure this matches the correct field for bio text
  }));
}

app.get('/buyers', async (req, res) => {
  try {
    // Fetch buyers from Firestore
    const buyersSnapshot = await db.collection('buyers').where('followers_to_get', '>', 0).get();
    const buyers = buyersSnapshot.docs.map(doc => ({ fid: doc.id, ...doc.data() }));

    // Fetch bios from Farcaster
    const fids = buyers.map(buyer => buyer.fid);
    const users = await fetchUsers(fids);

    // Combine buyer data with bios
    const results = buyers.map(buyer => {
      const user = users.find(u => u.fid === buyer.fid);
      return {
        ...buyer,
        bio: user ? user.bio : null // Add bio to the buyer data
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching buyers:', error.message);
    res.status(500).json({ error: 'An error occurred while fetching buyers' });
  }
});


app.post('/framefreecampaign', async (req, res) => {
  const { fid } = req.body;

  if (!fid) {
      return res.status(400).json({ error: 'Missing required fid' });
  }

  try {
      // Fetch username from Farcaster
      const url = `https://build.far.quest/farcaster/v2/user?fid=${fid}`;
      const options = {
          method: 'GET',
          headers: { accept: 'application/json', 'API-KEY': API_KEY }
      };
      const fetchResponse = await fetch(url, options);
      const json = await fetchResponse.json();
      const username = json?.result?.user?.username;
      console.log(fid)
      console.log(username)

      if (!username) {
          throw new Error('Failed to fetch username from Farcaster');
      }

      // Check if the user already has a campaign
      const buyerRef = db.collection('buyers').doc(String(fid)); // Ensure fid is a string
      const buyerDoc = await buyerRef.get();

      if (buyerDoc.exists) {
          return res.status(400).json({ error: 'User already has a campaign' });
      }

      // Create a new campaign with 5 followers
      await buyerRef.set({
          followers_to_get: 5,
          genre: 'gaming',
          username: username,
          pitch: 'Your default pitch here'
      });

      console.log("Did set.")

      res.json({ message: 'Campaign created successfully' });
  } catch (error) {
      console.error('Error creating campaign:', error.message);
      res.status(500).json({ error: 'An error occurred while creating the campaign' });
  }
});
  


app.get('/tokens', async (req, res) => {
  const { address, fid } = req.query;

  if (!address || !fid) {
    return res.status(400).json({ error: 'Address and FID are required' });
  }

  try {
    // Fetch token balance
    const balance = await fetchTokenBalance(address);

    // Fetch followers_to_get from Firebase
    const buyerRef = db.collection('buyers').doc(fid);
    const buyerDoc = await buyerRef.get();
    let followersToGet = 0;

    if (buyerDoc.exists) {
      const buyerData = buyerDoc.data();
      followersToGet = buyerData.followers_to_get || 0;
    }

    console.log(`Address: ${address}, Balance: ${balance}, FID: ${fid}, Followers to Get: ${followersToGet}`);

    res.json({ token_balance: balance, followers_to_get: followersToGet });
  } catch (error) {
    console.error('Error fetching tokens or followers:', error.message);
    res.status(500).json({ error: 'An error occurred while fetching the token balance and followers' });
  }
});

const API_URL = 'https://build.far.quest/farcaster/v2/users';

// Function to fetch user data (bios) from the API
async function fetchUsers(fids) {
  const response = await fetch(`${API_URL}?fids=${fids.join('%2C')}`, {
    method: 'GET',
    headers: {
      'API-KEY': API_KEY,
      'accept': 'application/json'
    }
  });
  const data = await response.json();
  return data.result.users.map(user => ({
    fid: user.fid,
    bio: user.bio.text // Ensure this matches the correct field for bio text
  }));
}

// Function to get embeddings from OpenAI
async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Function to fetch buyers from Firestore
async function fetchBuyers() {
  const buyersSnapshot = await db.collection('buyers').where('followers_to_get', '>', 0).get();
  return buyersSnapshot.docs.map(doc => ({ fid: doc.id, ...doc.data() }));
}

// Endpoint to get similar pitches
app.post('/find-similar-pitches', async (req, res) => {
  try {
    const { userInterest } = req.body;

    console.log('User interest:', userInterest);

    if (!userInterest) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Fetch buyers from Firestore
    const buyers = await fetchBuyers();
    const fids = buyers.map(buyer => buyer.fid);

    console.log('Buyers:', fids);

    // Fetch users' bios
    const users = await fetchUsers(fids);

    console.log('Users:', users);

    // Get embedding for user interest
    const userInterestEmbedding = await getEmbedding(userInterest);

    console.log('User interest embedding:', userInterestEmbedding);

    // Get embeddings for bios
    const bioEmbeddings = await Promise.all(users.map(user => getEmbedding(user.bio)));

    // Calculate similarities and combine with buyer data
    const results = buyers.map((buyer, index) => {
      const user = users.find(u => u.fid === buyer.fid);
      return {
        ...buyer,
        bio: user ? user.bio : null,
        similarity: cosineSimilarity(userInterestEmbedding, bioEmbeddings[index])
      };
    });

    // Sort results by similarity score in descending order
    results.sort((a, b) => b.similarity - a.similarity);

    res.json({ results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server

app.listen(process.env.PORT || port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
