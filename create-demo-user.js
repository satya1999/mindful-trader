import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlspnbwbcvenjghstmbt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc3BuYndiY3ZlbmpnaHN0bWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDQ3NTQsImV4cCI6MjA5MzMyMDc1NH0.18toPiiH-Vitiz-kfzHRLhKZACnoXrXa0HboYBrP1is';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemo() {
  const email = 'demo@mindfultrader.test';
  const password = 'MindfulTrade_Demo2026!';

  console.log('Attempting to create demo user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
        console.log('User already exists, checking if we can sign in...');
    } else {
        console.error('Sign up error:', signUpError);
    }
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign in error:', signInError);
    console.log('Email confirmation might be required, or credentials failed.');
  } else {
    console.log('SUCCESS! Demo user created and can sign in.');
  }
}

createDemo();
