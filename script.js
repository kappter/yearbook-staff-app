function initGoogleAuth() {
  gapi.load('client:auth2', () => {
    gapi.client.init({
      clientId: '782915328509-4joueiu50j6kkned1ksk1ccacusblka5.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/spreadsheets',
      redirect_uri: 'https://kappter.github.io/yearbook-staff-app/',
      hosted_domain: 'graniteschools.org'
    }).then(() => {
      const auth = gapi.auth2.getAuthInstance();
      auth.isSignedIn.listen(updateSignInStatus);
      updateSignInStatus(auth.isSignedIn.get());
      document.getElementById('login-btn').onclick = () => auth.signIn();
    }, (error) => {
      console.error('Auth initialization error:', error.details || error);
    });
  });
}

function updateSignInStatus(isSignedIn) {
  if (isSignedIn) {
    const profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
    document.getElementById('user-info').innerText = `Welcome, ${profile.getName()} (${profile.getEmail()})`;
    localStorage.setItem('userEmail', profile.getEmail());
    localStorage.setItem('userName', profile.getName());
  } else {
    document.getElementById('user-info').innerText = '';
  }
}

window.onload = initGoogleAuth;
