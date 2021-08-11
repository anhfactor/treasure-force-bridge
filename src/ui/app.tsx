/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';
import { SudtERC20Wrapper } from '../lib/contracts/SudtERC20Wrapper';
import { TreasureWrapper } from '../lib/contracts/TreasureWrapper';
import { getLayer2ckETHBalance } from '../lib/contracts/ERC20Helper';

import { CONFIG } from '../config';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}
interface Treasure {
    name: string,
    total: number
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<TreasureWrapper>();
    const [contractSUDT, setContractSUDT] = useState<SudtERC20Wrapper>();
    const [contractCKETH, setContractCKETH] = useState<SudtERC20Wrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [l2ckETHBalance, setL2ckETHBalance] = useState<bigint>();
    const [sudtBalance, setSUDTBalance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [treasures, setTreasures] = useState<Treasure[] | undefined>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [Layer2DepositAddress, setLayer2DepositValue] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));

            getDepositAddress();
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    useEffect (() => {
        if (web3 && polyjuiceAddress && accounts?.[0]) {
            (async () => {
                const _l2ckETHBalance = BigInt (await getLayer2ckETHBalance (web3, polyjuiceAddress, accounts?.[0]));
                console.log (_l2ckETHBalance);
                setL2ckETHBalance (_l2ckETHBalance);
            })();
        }
    }, [web3, polyjuiceAddress, accounts?.[0]]);

    const account = accounts?.[0];

    async function randomTreasure(){
        var randomValue = Math.floor(Math.random() * 3);
        return CONFIG.TREASURES[randomValue]
    }

    async function deployContract() {
        const _contract = new TreasureWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);

            const transactionHash = await _contract.deploy(account);

            setDeployTxHash(transactionHash);
            setExistingContractAddress(_contract.address);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }
    async function getSUDTBalance() {
        setSUDTBalance(null);
        const value = await contractSUDT.getSUDTBalance(polyjuiceAddress,account);
        setSUDTBalance(value);
    }
    async function getCKETHBalance() {
        setCKETHBalance(null);
        const value = await contractCKETH.getSUDTBalance(polyjuiceAddress,account);
        setCKETHBalance(value);
    }
    async function getL2Balance() {
        setL2Balance(null);
        const value = BigInt(await web3.eth.getBalance(account));
        setL2Balance(value);
    }
    async function getDepositAddress() {
        const addressTranslator = new AddressTranslator();
        const Layer2DepositAddressData = await addressTranslator.getLayer2DepositAddress(web3,accounts?.[0]);
        setLayer2DepositValue(Layer2DepositAddressData.addressString);
    }

    async function getTotalTreasure() {
        
        let new_treasures = [];
        let contract_instance = contract;
        console.log(contract_instance);
        for (let index = 0; index < CONFIG.TREASURES.length; index++) {
            const element = CONFIG.TREASURES[index];
            let value = await contract_instance.getTotalTreasuresFor(element,account);
            new_treasures.push({
                name: element,
                total: value
            }) ;
        }
        setTreasures(new_treasures);
    }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new TreasureWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        setTreasures(undefined);
    }

    async function copyDepositAddress(){
        navigator.clipboard.writeText(Layer2DepositAddress);
        toast(
            'Copied success.',
            { type: 'success' }
        );
    }

    async function claimForTreasure() {
        try {
            setTransactionInProgress(true);
            var getTreasure = await randomTreasure();
            await contract.claimForTreasure(getTreasure, account);
            toast(
                'Successfully set latest stored value. You can refresh the read value now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
            getTotalTreasure();
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);
            const _contract = new SudtERC20Wrapper(_web3);
            _contract.useDeployed(CONFIG.SUDT_CONTRACT);
    
            setContractSUDT(_contract);
            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            const addressTranslator = new AddressTranslator();
            const _polyjuiceAdress = addressTranslator.ethAddressToGodwokenShortAddress(_accounts[0]);
            setPolyjuiceAddress(_polyjuiceAdress);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
                const value = await _contract.getSUDTBalance(_polyjuiceAdress,_accounts[0]);
                setSUDTBalance(value);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            <br />
            Layer 2 Deposit address:
            <input
            type="text" readOnly
                placeholder="Existing contract id"
                value={Layer2DepositAddress}
            />
            <button onClick={copyDepositAddress} disabled={!Layer2DepositAddress}>Copy Address</button>
            <a target="_blank" href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000">
            <button  disabled={!Layer2DepositAddress}>Deposit now!</button>
            </a>
            <small>* Please input the deposit address above in the "Recipient" input </small>
            <br />
            <br />
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <button onClick={getL2Balance}  disabled={!l2Balance&&!account}>Reload balance</button>

            <br />
            <br />
            Nervos SUDT balance:{' '}
            <b>{sudtBalance ? sudtBalance : <LoadingIndicator />} SUDT</b>
            <button onClick={getSUDTBalance}   disabled={!sudtBalance&&!account}>Reload balance</button>
            <br />
            <br />
            Nervos ckETH Balance: <b>{l2ckETHBalance !== undefined ? ((Number (l2ckETHBalance) / (1000000))).toString () : <LoadingIndicator />} ckETH</b>
            <br />
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            Deploy transaction hash: <b>{deployTxHash || '-'}</b>
            <br />
            <hr />
            <button onClick={deployContract} disabled={!l2Balance}>
                Deploy contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !l2Balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            <br />
            <br />
            <br />
            <h2>Claim your treasure</h2>
            <h3>Click button "Refresh treasure list" to get list treasure. Then choose claim.</h3>
            <hr />
            <button onClick={getTotalTreasure} disabled={!contract}>
                Refresh treasure list
            </button>
            <table className="treasure-table">
            <thead>
                <tr>
                    <th>Treasure</th>
                    <th>Total</th>
                </tr>
                </thead>
                <tbody>
                {treasures ? 
                treasures.map((treasure) =>
                <tr key={treasure.name}>
                <td>{treasure.name}</td>
                    <td>{treasure.total}</td>
                </tr>
                ): null}  
                </tbody>

            </table>

    
            <br />
            <br />

            <button onClick={claimForTreasure} disabled={!contract}>
                Claim for treasure
            </button>
            <br/>
            *You will receive random treasure: Gold, Diamond, Ruby
            <br/>
            <img src="treasure.jpeg" style={{ width:"10%" }}/>
            <br />
            <br />
            <br />
            <br />
            <hr />
            The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After each
            transaction you might need to wait up to 120 seconds for the status to be reflected.
            <ToastContainer />
        </div>
    );
}
