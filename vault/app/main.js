// Importiamo le librerie necessarie. Vite le troverà in `node_modules`.
import * as anchor from '@coral-xyz/anchor';
import * as web3 from '@solana/web3.js';
import { Buffer } from 'buffer';

// "Polyfill" necessario per far funzionare le librerie di Solana nel browser.
window.Buffer = Buffer;

function initializeApp() {

    // Definiamo le costanti del programma
    const programId = new web3.PublicKey("EqXTMcsnvoWjQWsd7aaaSiAMZoYUAQrfvZmtqFErdxnZ");
    const idl = JSON.parse(`{"version":"0.1.0","name":"vault","instructions":[{"name":"initialize","accounts":[{"name":"user","isMut":true,"isSigner":true},{"name":"vault","isMut":true,"isSigner":false},{"name":"vaultState","isMut":true,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false}],"args":[]},{"name":"deposit","accounts":[{"name":"user","isMut":true,"isSigner":true},{"name":"vault","isMut":true,"isSigner":false},{"name":"vaultState","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false}],"args":[{"name":"amount","type":"u64"}]},{"name":"withdraw","accounts":[{"name":"user","isMut":true,"isSigner":true},{"name":"vault","isMut":true,"isSigner":false},{"name":"vaultState","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false}],"args":[{"name":"amount","type":"u64"}]},{"name":"close","accounts":[{"name":"user","isMut":true,"isSigner":true},{"name":"vault","isMut":true,"isSigner":false},{"name":"vaultState","isMut":true,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false}],"args":[]}],"accounts":[{"name":"VaultState","type":{"kind":"struct","fields":[{"name":"vaultBump","type":"u8"},{"name":"stateBump","type":"u8"}]}}]}`);

    // Variabili di stato globali
    let provider;
    let program;
    let wallet; // Questa variabile ora conterrà l'oggetto wallet completo
    let vaultPDA;
    let vaultStatePDA;

    // Riferimenti agli elementi UI
    const connectButton = document.getElementById("connectButton");
    const vaultStateDiv = document.getElementById("vaultState");
    const noVaultStateDiv = document.getElementById("noVaultState");
    const actionsDiv = document.getElementById("actions");
    const vaultBalanceEl = document.getElementById("vaultBalance");
    const vaultAddressEl = document.getElementById("vaultAddress");
    const initializeButton = document.getElementById("initializeButton");
    const depositButton = document.getElementById("depositButton");
    const withdrawButton = document.getElementById("withdrawButton");
    const closeButton = document.getElementById("closeButton");
    const amountInput = document.getElementById("amountInput");
    const statusMessage = document.getElementById("statusMessage");

    // Funzione per aggiornare l'intera interfaccia
    async function updateUI() {
        if (!wallet || !wallet.publicKey) {
            connectButton.innerText = "Connetti il Wallet";
            connectButton.disabled = false;
            vaultStateDiv.classList.add("hidden");
            noVaultStateDiv.classList.add("hidden");
            actionsDiv.classList.add("hidden");
            return;
        }

        const pubkey = wallet.publicKey.toBase58();
        connectButton.innerText = `Connesso: ${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
        connectButton.disabled = true;
        
        [vaultPDA] = web3.PublicKey.findProgramAddressSync([Buffer.from("vault"), wallet.publicKey.toBuffer()], program.programId);
        [vaultStatePDA] = web3.PublicKey.findProgramAddressSync([Buffer.from("state"), wallet.publicKey.toBuffer()], program.programId);
        
        setStatus("Verifica vault...");
        try {
            await program.account.vaultState.fetch(vaultStatePDA);
            
            const balanceLamports = await provider.connection.getBalance(vaultPDA);
            const balanceSOL = balanceLamports / web3.LAMPORTS_PER_SOL;
            
            vaultBalanceEl.innerText = `${balanceSOL.toFixed(4)} SOL`;
            vaultAddressEl.innerText = `Indirizzo: ${vaultPDA.toBase58().slice(0,10)}...`;

            vaultStateDiv.classList.remove("hidden");
            noVaultStateDiv.classList.add("hidden");
            actionsDiv.classList.remove("hidden");
            setStatus("Pronto.");
        } catch (error) {
            console.log("Vault non trovato, probabilmente non inizializzato.");
            vaultStateDiv.classList.add("hidden");
            noVaultStateDiv.classList.remove("hidden");
            actionsDiv.classList.add("hidden");
            setStatus("Per favore, crea un vault.");
        }
    }

    function setStatus(message, isError = false) {
        statusMessage.innerText = message;
        statusMessage.style.color = isError ? "#f87171" : "#94a3b8";
    }
    
    // Aggiorniamo la funzione per includere tutti i bottoni
    function setLoadingState(isLoading) {
        const buttons = [initializeButton, depositButton, withdrawButton, closeButton, connectButton];
        buttons.forEach(btn => { if(btn) btn.disabled = isLoading });
        if(isLoading) setStatus("Transazione in corso...");
    }

    // Gestore per la connessione al wallet
    connectButton.onclick = async () => {
        try {
            const solana = window.solana;
            if (solana && solana.isPhantom) {
                await solana.connect({ onlyIfTrusted: false });
                wallet = solana;
                const connection = new web3.Connection("http://127.0.0.1:8899", "confirmed");
                provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
                program = new anchor.Program(idl, programId, provider);
                await updateUI();
            } else {
                alert("Wallet Phantom non trovato! Per favore installalo.");
            }
        } catch (error) {
            console.error("Errore di connessione al wallet:", error);
            setStatus("Connessione fallita.", true);
        }
    };

    // Gestore per la creazione del vault
    initializeButton.onclick = async () => {
        setLoadingState(true);
        try {
            await program.methods
                .initialize()
                .accounts({
                    user: wallet.publicKey,
                    vault: vaultPDA,
                    vaultState: vaultStatePDA,
                })
                .rpc();
            setStatus("Vault creato con successo!");
            await updateUI();
        } catch (error) {
            console.error("Errore durante l'inizializzazione:", error);
            setStatus("Creazione del vault fallita.", true);
        } finally {
            setLoadingState(false);
        }
    };

    // --- NUOVA LOGICA ---

    // Gestore per il deposito
    depositButton.onclick = async () => {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            return setStatus("Per favore, inserisci un importo valido.", true);
        }
        
        setLoadingState(true);
        try {
            const lamports = new anchor.BN(amount * web3.LAMPORTS_PER_SOL);
            await program.methods
                .deposit(lamports)
                .accounts({
                    user: wallet.publicKey,
                    vault: vaultPDA,
                    vaultState: vaultStatePDA,
                })
                .rpc();
            setStatus("Deposito completato!");
            await updateUI();
        } catch (error) {
            console.error("Errore durante il deposito:", error);
            setStatus("Deposito fallito.", true);
        } finally {
            setLoadingState(false);
        }
    };

    // Gestore per il prelievo
    withdrawButton.onclick = async () => {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            return setStatus("Per favore, inserisci un importo valido.", true);
        }
        
        setLoadingState(true);
        try {
            const lamports = new anchor.BN(amount * web3.LAMPORTS_PER_SOL);
            await program.methods
                .withdraw(lamports)
                .accounts({
                    user: wallet.publicKey,
                    vault: vaultPDA,
                    vaultState: vaultStatePDA,
                })
                .rpc();
            setStatus("Prelievo completato!");
            await updateUI();
        } catch (error) {
            console.error("Errore durante il prelievo:", error);
            setStatus("Prelievo fallito.", true);
        } finally {
            setLoadingState(false);
        }
    };

    // Gestore per la chiusura del vault
    closeButton.onclick = async () => {
        if (!confirm("Sei sicuro di voler chiudere il vault? L'operazione è irreversibile e tutti i fondi verranno restituiti.")) {
            return;
        }
        setLoadingState(true);
        try {
            await program.methods
                .close()
                .accounts({
                    user: wallet.publicKey,
                    vault: vaultPDA,
                    vaultState: vaultStatePDA,
                })
                .rpc();
            setStatus("Vault chiuso con successo!");
            await updateUI(); // L'interfaccia tornerà allo stato "Nessun vault"
        } catch (error) {
            console.error("Errore durante la chiusura:", error);
            setStatus("Chiusura del vault fallita.", true);
        } finally {
            setLoadingState(false);
        }
    };
    
    updateUI();
}

initializeApp();

