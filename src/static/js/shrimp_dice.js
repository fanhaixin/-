$(function() {
  consoleInit()
  start(main)
})

async function main() {
  print_warning()

  const stakingTokenAddr = DICE_TOKEN_ADDR
  const stakingTokenTicker = 'DICE'
  const rewardPoolAddr = '0xCeC3fc05f9314528b5Ef324a2e2C47f1D8BeD515'
  const rewardTokenAddr = SHRIMP_TOKEN_ADDR
  const balancerPoolTokenAddr = '0xc7062D899dd24b10BfeD5AdaAb21231a1e7708fE'
  const rewardTokenTicker = 'SHRIMP'
  const uniswapPoolAddr = ETH_DICE_UNI_TOKEN_ADDR

  const App = await init_ethers()

  _print(`Initialized ${App.YOUR_ADDRESS}`)
  _print('Reading smart contracts...\n')
  _print(`${rewardTokenTicker} Address: ${rewardTokenAddr}`)
  _print(`Reward Pool Address: ${rewardPoolAddr}\n`)

  const Y_STAKING_POOL = new ethers.Contract(rewardPoolAddr, Y_STAKING_POOL_ABI, App.provider)
  //   const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider)
  const Y_TOKEN = new ethers.Contract(stakingTokenAddr, ERC20_ABI, App.provider)
  const YFFI_DAI_BALANCER_POOL = new ethers.Contract(balancerPoolTokenAddr, BALANCER_POOL_ABI, App.provider)

  //   const YAM_TOKEN = new ethers.Contract(YAM_TOKEN_ADDR, YAM_TOKEN_ABI, App.provider)
  const SHRIMP_TOKEN = new ethers.Contract(SHRIMP_TOKEN_ADDR, YAM_TOKEN_ABI, App.provider)
  const UNI_V2_TOKEN = new ethers.Contract(uniswapPoolAddr, ERC20_ABI, App.provider)
  const WETH_TOKEN = new ethers.Contract(WETH_TOKEN_ADDR, ERC20_ABI, App.provider)

  const yamScale = (await SHRIMP_TOKEN.yamsScalingFactor()) / 1e18

  const stakedYAmount = (await Y_STAKING_POOL.balanceOf(App.YOUR_ADDRESS)) / 1e18
  const earnedYFFI = (yamScale * (await Y_STAKING_POOL.earned(App.YOUR_ADDRESS))) / 1e18
  const totalSupplyY = (await Y_TOKEN.totalSupply()) / 1e18
  const totalStakedYAmount = (await Y_TOKEN.balanceOf(rewardPoolAddr)) / 1e18

  // Find out reward rate
  const weekly_reward =
    ((await get_synth_weekly_rewards(Y_STAKING_POOL)) * (await SHRIMP_TOKEN.yamsScalingFactor())) / 1e18
  const nextHalving = await getPeriodFinishForReward(Y_STAKING_POOL)

  // const weekly_reward = 0;

  const rewardPerToken = weekly_reward / totalStakedYAmount

  // Find out underlying assets of Y
  // const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;
  const unstakedY = (await Y_TOKEN.balanceOf(App.YOUR_ADDRESS)) / 1e18

  _print('Finished reading smart contracts... Looking up prices... \n')

  const ethAmount = (await WETH_TOKEN.balanceOf(uniswapPoolAddr)) / 1e18
  const diceAmount = (await Y_TOKEN.balanceOf(uniswapPoolAddr)) / 1e18
  const totalUNIV2Amount = (await UNI_V2_TOKEN.totalSupply()) / 1e18

  // Look up prices
  // const prices = await lookUpPrices(["yearn-finance"]);
  // const YFIPrice = prices["yearn-finance"].usd;
  const prices = await lookUpPrices(['ethereum', 'shrimp-finance'])
  const stakingTokenPrice = 55.38

  // const rewardTokenPrice = (await YFFI_DAI_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR, rewardTokenAddr) / 1e18) * stakingTokenPrice;
  const rewardTokenPrice = prices['shrimp-finance'].usd

  // Finished. Start printing

  _print('========== PRICES ==========')
  _print(`1 ${rewardTokenTicker}   = $${rewardTokenPrice}`)
  _print(`1 ${stakingTokenTicker}  = $${stakingTokenPrice}\n`)

  _print('========== STAKING =========')
  _print(`There are total   : ${totalSupplyY} ${stakingTokenTicker}.`)
  _print(
    `There are total   : ${totalStakedYAmount} ${stakingTokenTicker} staked in ${rewardTokenTicker}'s ${stakingTokenTicker} staking pool.`
  )
  _print(`                  = ${toDollar(totalStakedYAmount * stakingTokenPrice)}\n`)
  _print(
    `You are staking   : ${stakedYAmount} ${stakingTokenTicker} (${toFixed(
      (stakedYAmount * 100) / totalStakedYAmount,
      3
    )}% of the pool)`
  )
  _print(`                  = ${toDollar(stakedYAmount * stakingTokenPrice)}\n`)

  // YFII REWARDS
  _print(`======== ${rewardTokenTicker} REWARDS ========`)
  // _print(" (Temporarily paused until further emission model is voted by the community) ");
  _print(
    `Claimable Rewards : ${toFixed(earnedYFFI, 4)} ${rewardTokenTicker} = $${toFixed(earnedYFFI * rewardTokenPrice, 2)}`
  )
  const YFFIWeeklyEstimate = rewardPerToken * stakedYAmount

  _print(
    `Hourly estimate   : ${toFixed(YFFIWeeklyEstimate / (24 * 7), 4)} ${rewardTokenTicker} = ${toDollar(
      (YFFIWeeklyEstimate / (24 * 7)) * rewardTokenPrice
    )} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} ${rewardTokenTicker})`
  )
  _print(
    `Daily estimate    : ${toFixed(YFFIWeeklyEstimate / 7, 2)} ${rewardTokenTicker} = ${toDollar(
      (YFFIWeeklyEstimate / 7) * rewardTokenPrice
    )} (out of total ${toFixed(weekly_reward / 7, 2)} ${rewardTokenTicker})`
  )
  _print(
    `Weekly estimate   : ${toFixed(YFFIWeeklyEstimate, 2)} ${rewardTokenTicker} = ${toDollar(
      YFFIWeeklyEstimate * rewardTokenPrice
    )} (out of total ${weekly_reward} ${rewardTokenTicker})`
  )
  const YFIWeeklyROI = (rewardPerToken * rewardTokenPrice * 100) / stakingTokenPrice

  _print(`\nHourly ROI in USD : ${toFixed(YFIWeeklyROI / 7 / 24, 4)}%`)
  _print(`Daily ROI in USD  : ${toFixed(YFIWeeklyROI / 7, 4)}%`)
  _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
  _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

  const timeTilHalving = nextHalving - Date.now() / 1000

  _print(`Reward ending      : in ${forHumans(timeTilHalving)} \n`)

  const approveTENDAndStake = async function() {
    return rewardsContract_stake(stakingTokenAddr, rewardPoolAddr, App)
  }

  const unstake = async function() {
    return rewardsContract_unstake(rewardPoolAddr, App)
  }

  const claim = async function() {
    return rewardsContract_claim(rewardPoolAddr, App)
  }

  const exit = async function() {
    return rewardsContract_exit(rewardPoolAddr, App)
  }

  _print_link(`Stake ${unstakedY} ${stakingTokenTicker}`, approveTENDAndStake)
  _print_link(`Unstake ${stakedYAmount} ${stakingTokenTicker}`, unstake)
  _print_link(`Claim ${earnedYFFI} ${rewardTokenTicker}`, claim)
  _print_link(`Exit`, exit)

  await _print24HourPrice('shrimp-finance', rewardTokenTicker)

  hideLoading()
}
