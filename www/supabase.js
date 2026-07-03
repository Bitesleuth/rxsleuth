(function () {
  const SUPABASE_URL = 'https://frinabxkqygyjqwdklzm.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_vp_aHW69EHMVRPQqbw8_XA_VOTJDpqU';

  const { createClient } = supabase;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.RX_Supabase = {
    // Auth
    signUpWithEmail: (email, password) =>
      db.auth.signUp({ email, password }),

    signInWithEmail: (email, password) =>
      db.auth.signInWithPassword({ email, password }),

    signInWithGoogle: () =>
      db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      }),

    signOut: () => db.auth.signOut(),

    getSession: () => db.auth.getSession(),

    onAuthChange: (cb) => db.auth.onAuthStateChange(cb),

    getUser: () => db.auth.getUser(),

    // Database helpers
    from: (table) => db.from(table),

    // Delete account and all data
    deleteAccount: async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return { error: { message: 'Not logged in' } };
      const { error } = await db.rpc('delete_user_account');
      if (!error) await db.auth.signOut();
      return { error };
    }
  };
})();