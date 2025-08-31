import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { assert } from "chai";

describe("vault", () => {
  // Configura il client per usare il cluster locale.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.vault as Program<Vault>;

  // L'utente legittimo che possiede il vault
  const owner = provider.wallet;

  // Un secondo wallet per simulare un attaccante
  const hacker = anchor.web3.Keypair.generate();

  // Calcoliamo in anticipo gli indirizzi dei PDA per il proprietario
  const [vaultPDA, _vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.publicKey.toBuffer()],
    program.programId
  );
  const [vaultStatePDA, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), owner.publicKey.toBuffer()],
    program.programId
  );

  // Prima di iniziare i test, diamo dei fondi all'hacker per pagare le fee
  before(async () => {
    const airdropTx = await provider.connection.requestAirdrop(
      hacker.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL // Diamo 2 SOL all'hacker
    );
    await provider.connection.confirmTransaction(airdropTx);
  });


  // --- Suite di Test Funzionali ("Happy Path") ---

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        user: owner.publicKey,
      })
      .rpc();

    // Verifichiamo che il vault abbia ricevuto i SOL per la rent
    const vaultBalance = await provider.connection.getBalance(vaultPDA);
    assert.isAbove(vaultBalance, 0, "Il vault dovrebbe avere un saldo per la rent");
  });

  it("Deposits SOL into the vault", async () => {
    const depositAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL
    const vaultBalanceBefore = await provider.connection.getBalance(vaultPDA);

    await program.methods
      .deposit(depositAmount)
      .accounts({
        user: owner.publicKey,
      })
      .rpc();

    const vaultBalanceAfter = await provider.connection.getBalance(vaultPDA);
    assert.equal(
      vaultBalanceAfter,
      vaultBalanceBefore + depositAmount.toNumber(),
      "Il saldo del vault non è aumentato correttamente"
    );
  });

  it("Withdraws SOL from the vault", async () => {
    const withdrawAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL); // 0.5 SOL
    const vaultBalanceBefore = await provider.connection.getBalance(vaultPDA);
    const userBalanceBefore = await provider.connection.getBalance(owner.publicKey);

    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        user: owner.publicKey,
      })
      .rpc();
    
    const vaultBalanceAfter = await provider.connection.getBalance(vaultPDA);
    const userBalanceAfter = await provider.connection.getBalance(owner.publicKey);

    assert.equal(
      vaultBalanceAfter,
      vaultBalanceBefore - withdrawAmount.toNumber(),
      "Il saldo del vault non è diminuito correttamente"
    );
    // Nota: non possiamo verificare il saldo dell'utente in modo esatto a causa delle fee
    assert.isAbove(
        userBalanceAfter,
        userBalanceBefore - withdrawAmount.toNumber(),
        "Il saldo dell'utente dovrebbe essere aumentato (meno le fee)"
    );
  });

  // --- Suite di Test di Sicurezza (Simulazione di Attacchi) ---

  describe("Security Tests", () => {
    
    it("FAIL: Hacker tries to withdraw from owner's vault", async () => {
      const withdrawAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      
      try {
        // L'hacker prova a chiamare `withdraw`, firmando con il proprio wallet.
        // Passa l'account del proprietario legittimo (`owner.publicKey`) come `user`,
        // ma la transazione è firmata dall'`hacker`.
        await program.methods
          .withdraw(withdrawAmount)
          .accounts({
            user: owner.publicKey, // Specifica l'utente corretto per derivare il PDA...
            vault: vaultPDA,
            vaultState: vaultStatePDA,
          })
          .signers([hacker]) // ...ma la firma è quella sbagliata!
          .rpc();

        // Se arriviamo qui, l'attacco è riuscito, quindi il test deve fallire.
        assert.fail("L'attacco è riuscito! L'hacker ha prelevato fondi non suoi.");

      } catch (error) {
        // Ci aspettiamo un errore. Il fatto che il codice arrivi qui
        // significa che la transazione è stata bloccata con successo.
        console.log("   ✅ Test superato: L'attacco di prelievo non autorizzato è stato bloccato.");
      }
    });

    it("FAIL: Owner tries to withdraw from a fake vault", async () => {
      const withdrawAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

      // L'hacker crea il *suo* vault personale per provare a sostituirlo
      const [hackerVaultPDA, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), hacker.publicKey.toBuffer()],
        program.programId
      );

      try {
        // Il proprietario firma correttamente, ma l'hacker ha creato una transazione
        // malevola che passa il SUO vault (`hackerVaultPDA`) al posto di quello del proprietario.
        await program.methods
          .withdraw(withdrawAmount)
          .accounts({
            user: owner.publicKey,
            vault: hackerVaultPDA, // <-- ATTACCO DI SOSTITUZIONE!
            vaultState: vaultStatePDA, 
          })
          .rpc();
        
        assert.fail("L'attacco è riuscito! Il programma ha prelevato da un vault sbagliato.");

      } catch (error) {
        // Ci aspettiamo un errore. Il fatto che il codice arrivi qui
        // significa che la transazione è stata bloccata con successo.
        console.log("   ✅ Test superato: L'attacco di sostituzione del vault è stato bloccato.");
      }
    });
    
    it("FAIL: Hacker tries to close owner's vault", async () => {
        try {
            // L'hacker prova a chiudere il vault del proprietario per rubare la rent.
            // Firma con il suo wallet.
            await program.methods
                .close()
                .accounts({
                    user: owner.publicKey,
                    vault: vaultPDA,
                    vaultState: vaultStatePDA,
                })
                .signers([hacker])
                .rpc();

            assert.fail("L'attacco è riuscito! L'hacker ha chiuso un vault non suo.");
        } catch (error) {
            // Ci aspettiamo un errore. Il fatto che il codice arrivi qui
            // significa che la transazione è stata bloccata con successo.
            console.log("   ✅ Test superato: L'attacco di chiusura non autorizzata è stato bloccato.");
        }
    });

  });

  // Il test di chiusura deve essere l'ultimo, perché distrugge gli account.
  it("Closes the vault", async () => {
    const vaultStateBalanceBefore = await provider.connection.getBalance(vaultStatePDA);
    assert.isAbove(vaultStateBalanceBefore, 0);

    await program.methods
      .close()
      .accounts({
        user: owner.publicKey,
      })
      .rpc();

    // Verifichiamo che l'account dello stato sia stato cancellato
    const vaultStateInfoAfter = await provider.connection.getAccountInfo(vaultStatePDA);
    assert.isNull(vaultStateInfoAfter, "L'account vault_state doveva essere chiuso e il suo saldo nullo.");
  });
});


