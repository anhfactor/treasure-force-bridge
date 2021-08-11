import Web3 from 'web3';
import * as ContractArtifact from '../../../build/contracts/SudtERC20Proxy.json';
import { CONFIG } from '../../config';


export async function getLayer2ckETHBalance (web3: Web3, polyjuiceAddress: string, ethAddress: string) {
    const contract = new web3.eth.Contract(ContractArtifact.abi as any, CONFIG.SUDT_CONTRACT) as any;
    return await contract.methods.balanceOf (polyjuiceAddress).call ({
        from: ethAddress
    });
}