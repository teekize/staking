import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import {
  contractAddress,
  contractAbi,
  causeAddress,
  causeAbi,
} from "../utils/constants";

export const TransactionContext = React.createContext();

const getCauseContract = () => {
  const { BinanceChain } = window;
  const provider = new ethers.providers.Web3Provider(BinanceChain);
  const signer = provider.getSigner();
  const causeContract = new ethers.Contract(causeAddress, causeAbi, signer);

  return causeContract;
};

const getCauseStakingContract = () => {
  const { BinanceChain } = window;
  const provider = new ethers.providers.Web3Provider(BinanceChain);
  const signer = provider.getSigner();
  const causeStakingContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    signer
  );

  return causeStakingContract;
};

export const TransactionProvider = ({ children }) => {
  const router = useRouter();
  const [chainId, setChainId] = useState(null);
  const [currentAccount, setcurrentAccount] = useState("");
  const [BnBbalance, setBnBbalance] = useState(null);
  const [Causebalance, setCausebalance] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
  });
  const [stakePeriod, setStakePeriod] = useState(null);
  const [totalAddressStakes, settotalAddressStakes] = useState(0);
  const [accountStakes, setaccountStakes] = useState([]);
  const [totalStakedAmount, settotalStakedAmount] = useState(0);
  const [isLoading, setIsloading] = useState(false);
  const [isStaking, setIsstaking] = useState(false);
  const [addressRewards, setAddressRewards] = useState(0);

  const REWARDS = {
    six: 5.12,
    twelve: 8.3,
    eighteen: 16.08,
    twentyFour: 30.6,
  };

  const getReward = (stake) => {
    let reward;
    if (stake !== undefined) {
      // console.log(stake)
      if (stake.duration === 6) {
        reward = stake.amount * REWARDS["six"];
        stake["reward"] = reward.toFixed(0);
        return stake;
      }

      if (stake.duration === 12) {
        reward = stake.amount * REWARDS["twelve"];
        stake["reward"] = reward.toFixed(0);
        return stake;
      }

      if (stake.duration === 18) {
        reward = stake.amount * REWARDS["eighteen"];
        stake["reward"] = reward.toFixed(0);
        return stake;
      }

      if (stake.duration === 24) {
        reward = stake.amount * REWARDS["twentyFour"];
        stake["reward"] = reward.toFixed(0);
        return stake;
      }
    }
  };

  const handleChainIDChange = () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");
      if (BinanceChain) {
        BinanceChain.on("chainChanged", (_chainId) => window.location.reload());
      }
    } catch (e) {
      console.log(e);
    }
  };
  const handleChange = (e, name) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAddressBNBbalance = () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");
      if (BinanceChain) {
        BinanceChain.request({
          method: "eth_getBalance",
          params: [currentAccount, "latest"],
        })
          .then((result) => {
            setBnBbalance(parseInt(result, 16));
            // console.log( parseInt(result, 16));
          })
          .catch((error) => {
            console.log(error);
          });
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getBinanceChainId = () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");
      if (BinanceChain) {
        let id = BinanceChain.chainId;
        setChainId(parseInt(id, 16));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getCauseCoinBalance = async () => {
    try {
      if (!BinanceChain) return alert("Please Install Binance Wallet");

      // ensure that chain id mainet
      const causeContract = getCauseContract();
      let balance = await causeContract.balanceOf(currentAccount);
      // let parsedAmount=ethers.utils.parseEther(balance);
      console.log(balance);
      setCausebalance(balance);
    } catch (e) {
      console.log(e);
    }
  };

  const SetDuration = (time) => {
    setStakePeriod(time);
    console.log(time);
  };

  const stakeCause = async () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");
      setIsstaking(true);
      const causeContract = getCauseContract();
      const stakingContract = getCauseStakingContract();
      // let parsedAmount=ethers.utils.parseEther(formData.amount);
      // console.log(parsedAmount.toNumber())
      let res = await causeContract.approve(contractAddress, formData.amount);

      console.log("transaction has been sent");
      console.log(res.hash);

      let receipt = await res.wait();

      console.log(`transaction has been successfull `);

      // //  add a duration parameter
      let result = await stakingContract.stake(formData.amount, stakePeriod);
      console.log(`stake has created`);
      let logs = await result.wait();
      console.log(`stake has been made`);
      setFormData((prevState) => ({ ...prevState, ["amount"]: "" }));
      setStakePeriod(null);
      setIsstaking(false);
      getAllStakes();
      if (logs) {
        router.push("/stakes");
      }
    } catch (e) {
      console.log(e);
    }
  };

  const unStakeCause = async (id) => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");

      const stakingContract = getCauseStakingContract();
      let result = await stakingContract.unstake(id);
      console.log(`transaction sent tx hash -----> ${result.hash}`);
      let reciept = await result.wait();
      console.log(`transaction confirmed you have unstaked `);
      console.log(reciept);
      getAllStakes();
    } catch (e) {
      console.log(e);
    }
  };

  const getAllStakes = async () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");

      const stakingContract = getCauseStakingContract();
      let stakes = await stakingContract.addressStakes();
      let newStake = stakes.map((stake) => {
        // console.log(stake.amount);
        let newStake = {};
        if (stake !== undefined) {
          newStake["amount"] = stake.amount.toNumber();
          newStake["since"] = stake.since.toNumber();
          newStake["user"] = stake.user;
          newStake["id"] = stake.stakeId.toNumber();
          newStake["duration"] =
            stake.duration.toNumber() / (60 * 60 * 24) / 30;
          newStake["dueDate"] = stake.dueDate.toNumber();

          let period = stake.duration.toNumber() / (60 * 60 * 24) / 30;
          let reward;

          if (period === 6) {
            reward = stake.amount.toNumber() * REWARDS["six"]/100;
            newStake["reward"] = reward.toFixed(0);
          }

          if (period === 12) {
            reward = stake.amount.toNumber() * REWARDS["twelve"]/100;
            newStake["reward"] = reward.toFixed(0);
          }

          if (period === 18) {
            reward = stake.amount.toNumber() * REWARDS["eighteen"]/100;
            newStake["reward"] = reward.toFixed(0);
          }

          if (period === 24) {
            reward = stake.amount.toNumber() * REWARDS["twentyFour"]/100;
            newStake["reward"] = parseInt(reward.toFixed(0));
          }

          return newStake;
        }
      });
      console.log(newStake);
      setaccountStakes(newStake);
    } catch (e) {
      console.log(e);
    }
  };

  const getTotaStakedAmount = async () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");

      const stakingContract = getCauseStakingContract();
      let amount = await stakingContract.stakedAmount();
      settotalStakedAmount(amount.toNumber());
    } catch (e) {
      console.log(e);
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!BinanceChain) return alert("Please install Metamask!");
      const accounts = await BinanceChain.request({ method: "eth_accounts" });
      if (accounts.length) {
        setcurrentAccount(accounts[0]);
      } else {
        console.log("no account found");
      }
    } catch (e) {
      console.log(e);
      // throw new Error("No ethereum account!")
    }
  };

  const connectWallet = async () => {
    try {
      if (!BinanceChain) return alert("Please install Binance wallet!");
      const accounts = await BinanceChain.request({
        method: "eth_requestAccounts",
      });

      setcurrentAccount(accounts[0]);
    } catch (e) {
      console.log(e);
      alert("Please install Binance wallet!");
      //   throw new Error("No Binance account!");
    }
  };

  const disconnectAccount = () => {
    if (currentAccount) {
      setcurrentAccount("");
    }
  };

  const calculateStakedAmount = () => {
    if (accountStakes) {
      console.log(accountStakes);
      let total = 0;
      for (let i = 0; i < accountStakes.length; i++) {
        if (accountStakes[i] !== undefined) {
          total += accountStakes[i].amount;
        }
      }

      settotalAddressStakes(total);
    }
  };

  const calculateStakedRewards = () => {
    if (accountStakes) {
      console.log(accountStakes);
      let total = 0;

      for (let i = 0; i < accountStakes.length; i++) {
        if (accountStakes[i].id !==0) {
          
          let num = parseInt(accountStakes[i].reward);
          if(num !== NaN){

            console.log(num);
            total += num;
          }
        }
      }

      console.log(total);

      setAddressRewards(total);
    }
  };



  useEffect(() => {
    checkIfWalletIsConnected();
    getTotaStakedAmount();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      getAddressBNBbalance();
      getCauseCoinBalance();
      getAllStakes();
      getTotaStakedAmount();
    }
  }, [currentAccount]);

  useEffect(() => {
    calculateStakedAmount();
  }, [accountStakes]);

  // console.log(accountStakes);
  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        disconnectAccount,
        formData,
        currentAccount,
        isLoading,
        SetDuration,
        BnBbalance,
        Causebalance,
        chainId,
        handleChange,
        totalStakedAmount,
        totalAddressStakes,
        accountStakes,
        stakeCause,
        unStakeCause,
        getAllStakes,
        getTotaStakedAmount,
        isStaking,
        stakePeriod,
        calculateStakedAmount,
        addressRewards,
        calculateStakedRewards,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
