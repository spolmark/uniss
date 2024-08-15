import axios from "axios";
import {getProxy} from '../utils/common';
import {log} from "../utils/logger";

interface IUTXO {
    txid: string;
    vout: number;
    value: number;
}

export async function getUTXO(address: string): Promise<IUTXO[]> {
    log("info", `Waiting till UTXO is detected at this Address: ${address}`);

    return new Promise<IUTXO[]>((resolve) => {
        const checkForUtxo = async () => {
            try {
				let agent = getProxy();
                const response = await axios.get(`https://mempool.space/api/address/${address}/utxo`, {httpsAgent: agent});
                const utxos: IUTXO[] = response.data.map((utxoData: any) => ({
                    txid: utxoData.txid,
                    vout: utxoData.vout,
                    value: utxoData.value,
                }));

                if (utxos.length > 0) {
                    resolve(utxos);
                    clearInterval(intervalId);
                }
            } catch (error) {
                log("error", `Error fetching address UTXO: ${(error as Error).message}`);
            }
        };

        checkForUtxo();

        const intervalId = setInterval(checkForUtxo, 5000);
    });
}
