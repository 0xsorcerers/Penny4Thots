import { createPublicClient, http, type Address, type Abi } from "viem";
import { sepolia } from "viem/chains";
import penny4thots from "./src/abi/penny4thots.json";

const contractABI = penny4thots.abi as Abi;

const blockchain = {
  rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  contract_address: '0xbAeE4f46496eA294899abF4F1094DC8b168629dF' as Address,
};

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(blockchain.rpc),
});

const userAddress = '0xac77635787C6a34bfb2Cf14dd4E1A0974fd3e47e' as Address;

async function testContract() {
  console.log("Testing contract at:", blockchain.contract_address);
  console.log("User address:", userAddress);
  console.log("");
  
  try {
    // Test userTotalThots
    const totalThots = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'userTotalThots',
      args: [userAddress],
    });
    console.log("userTotalThots result:", Number(totalThots));
  } catch (error) {
    console.error("Error calling userTotalThots:", error);
  }
  
  try {
    // Test userTotalMarkets
    const totalMarkets = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'userTotalMarkets',
      args: [userAddress],
    });
    console.log("userTotalMarkets result:", Number(totalMarkets));
  } catch (error) {
    console.error("Error calling userTotalMarkets:", error);
  }

  try {
    // Test marketCount
    const marketCount = await publicClient.readContract({
      address: blockchain.contract_address,
      abi: contractABI,
      functionName: 'marketCount',
    });
    console.log("Total marketCount on contract:", Number(marketCount));
  } catch (error) {
    console.error("Error calling marketCount:", error);
  }
}

testContract();
