const authForm = document.getElementById('auth-form');
const authTabs = document.querySelectorAll('.auth-tab');
const nicknameGroup = document.getElementById('nickname-group');
const nicknameInput = document.getElementById('nickname-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authStatusEl = document.getElementById('auth-status');
const submitBtn = document.querySelector('.auth-submit');
const supabaseStatusEl = document.getElementById('supabase-status');
const supabaseDetailEl = document.getElementById('supabase-detail');

let authMode = 'login';

function updateSupabaseStatus() {
  const config = window.appConfig?.supabase || {};
  const isReady = config.enabled && config.url && config.anonKey && config.url !== 'https://YOUR_PROJECT_URL.supabase.co';

  if (isReady) {
    supabaseStatusEl.textContent = '연결 준비 완료';
    supabaseStatusEl.className = 'status-pill online';
    supabaseDetailEl.textContent = 'Supabase가 활성화되어 있습니다. 로그인/회원가입을 진행할 수 있습니다.';
    return;
  }

  supabaseStatusEl.textContent = '설정 대기 중';
  supabaseStatusEl.className = 'status-pill offline';
  supabaseDetailEl.textContent = 'Supabase URL과 anon key를 설정하면 로그인 기능이 활성화됩니다.';
}

function setMode(nextMode) {
  authMode = nextMode;
  const isSignup = nextMode === 'signup';

  nicknameGroup.classList.toggle('hidden', !isSignup);
  submitBtn.textContent = isSignup ? '회원가입' : '로그인';

  authTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === nextMode);
  });

  authStatusEl.textContent = isSignup
    ? '새 계정을 만들어 시작해 보세요.'
    : '계정에 로그인해 게임머니를 관리하세요.';
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    authStatusEl.textContent = '이메일과 비밀번호를 입력해 주세요.';
    return;
  }

  if (authMode === 'signup') {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
      authStatusEl.textContent = '닉네임을 입력해 주세요.';
      return;
    }
  }

  const { supabase } = window;

  if (!supabase) {
    authStatusEl.textContent = 'Supabase가 아직 설정되지 않았습니다. config.js를 채워 주세요.';
    updateSupabaseStatus();
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = authMode === 'signup' ? '가입 중...' : '로그인 중...';

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname: nicknameInput.value.trim(),
          },
        },
      });

      if (error) throw error;
      authStatusEl.textContent = '회원가입이 완료되었습니다. 이메일 인증을 확인해 주세요.';
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authStatusEl.textContent = '로그인 성공! 메인 페이지로 이동합니다.';
      window.location.href = 'index.html';
    }
  } catch (error) {
    authStatusEl.textContent = error.message || '처리 중 오류가 발생했습니다.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = authMode === 'signup' ? '회원가입' : '로그인';
  }
}

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

authForm.addEventListener('submit', handleAuthSubmit);

updateSupabaseStatus();
setMode('login');
