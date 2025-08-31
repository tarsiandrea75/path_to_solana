use anchor_lang::prelude::*;

declare_id!("3NFnK89LbbnVrrM2EoRKirzW3ww8aC6BiU2BzfyVDc1F");

#[program]
pub mod counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
