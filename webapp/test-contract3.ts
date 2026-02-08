import { createPublicClient, http, type Address, type Abi } from "viem";
import { sepolia } from "viem/chains";
import penny4thots from "./src/abi/penny4thots.json";

const contractABI = penny4thots.abi as Abi;

// Previous contract before blacklist update
const contractAddress = '0x76F2934291f899e20AA8092A3c25D4671d358099' as Address;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

const userAddress = '0xac77635787C6a34bfb2Cf14dd4E1A0974fd3e47e' as Address;

async function testContract() {
  console.log("Testing PREVIOUS contract at:", contractAddress);
  console.log("User address:", userAddress);
  console.log("");
  
  try {
    const totalThots = await publicClient.readContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'userTotalThots',
      args: [userAddress],
    });
    console.log("userTotalThots result:", Number(totalThots));
  } catch (error: any) {
    console.error("Error calling userTotalThots:", error.shortMessage || error.message);
  }
  
  try {
    const totalMarkets = await publicClient.readContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'userTotalMarkets',
      args: [userAddress],
    });
    console.log("userTotalMarkets result:", Number(totalMarkets));
  } catch (error: any) {
    console.error("Error calling userTotalMarkets:", error.shortMessage || error.message);
  }

  try {
    const marketCount = await publicClient.readContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'marketCount',
    });
    console.log("Total marketCount on contract:", Number(marketCount));
  } catch (error: any) {
    console.error("Error calling marketCount:", error.shortMessage || error.message);
  }
}

testContract();
