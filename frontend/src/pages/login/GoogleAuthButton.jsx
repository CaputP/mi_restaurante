import { GoogleLogin } from "@react-oauth/google";

function GoogleAuthButton({
    onSuccess,
    onError
}) {
    return (
        <div className="google-btn-container">
            <GoogleLogin
                onSuccess={onSuccess}
                onError={onError}
                theme="outline"
                size="large"
                text="continue_with"
                width="360px"
            />
        </div>
    );
}

export default GoogleAuthButton;