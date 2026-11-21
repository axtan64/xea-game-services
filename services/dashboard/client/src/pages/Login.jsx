// The sign-in card, centred over the backdrop as Discord's is
export default function Login() {
    return (
        <div className="login">
            <div className="login-card">
                <img className="login-logo" src="/xeadev.png" alt="" />
                <h1>Welcome back!</h1>
                <p>Sign in with the Roblox account that runs the games.</p>
                <a className="button brand large block" href="/auth/login">Sign in with Roblox</a>
                <p className="login-small">Only the dashboard's admins can sign in.</p>
            </div>
        </div>
    );
}
