import Table from 'cli-table3';
import {getAuthData, makeAuth} from "./unisat";
import {getBalance, readWallets, sleep} from "../utils/common";
import {Wallet} from "../utils/wallet";

const table = new Table({
    head: ['Address', 'Balance', 'Points'],
    colWidths: [65, 20, 10],
});

async function pointsChecker(): Promise<void> {
    const wallets = readWallets("wallets.txt");

    for (const seed of wallets) {
        const wallet = new Wallet({seed});

        const authData = await getAuthData(wallet.address);
        const sign = wallet.signMessage(authData?.data?.signMsg);

        const status = await makeAuth(wallet.address, wallet.publicKey, sign);

        if (status?.msg === "ok") {
            const userBalance = await getBalance(wallet.address);
            const balance = userBalance?.chain_stats?.funded_txo_sum - userBalance?.chain_stats?.spent_txo_sum;

            table.push([wallet.address, balance / 100_000_000, status.data.inscribeCount])
        }
        await sleep([1, 1])
    }
    console.log(table.toString());
}

if (require.main === module) {
    pointsChecker().catch(err => {
        console.error("Error:", err);
        process.exit(1);
    });
}