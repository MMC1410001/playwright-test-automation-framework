import firebase_admin
from firebase_admin import credentials, auth
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK (only once)
_firebase_app = None

def initialize_firebase():
    """
    Initialize Firebase Admin SDK if not already initialized
    Similar to Node.js: admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    """
    global _firebase_app
    if _firebase_app is None:
        try:
            # Try to find service account key file
            # Priority: 1. serviceAccountKey_python.json (current dir), 2. env var
            service_account_path = None
            
            # Option 1: Check for serviceAccountKey_python.json in current directory
            current_dir = Path(__file__).parent
            local_key = current_dir / "serviceAccountKey_python.json"
            if local_key.exists():
                service_account_path = str(local_key)
                logger.info(f"Using serviceAccountKey_python.json from {local_key}")
            
            # Option 2: Check environment variable
            if not service_account_path and os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
                service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
                logger.info(f"Using service account key from environment variable")
            
            if not service_account_path:
                raise FileNotFoundError(
                    "Firebase service account key not found. Please ensure one of these exists:\n"
                    "  - serviceAccountKey_python.json\n"
                    "  - Or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable"
                )
            
            # Initialize Firebase Admin SDK (Python equivalent of Node.js pattern)
            # Node.js: admin.credential.cert(serviceAccount)
            # Python: credentials.Certificate(service_account_path)
            cred = credentials.Certificate(service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase Admin SDK initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Firebase Admin SDK: {str(e)}")
            raise
    return _firebase_app

def verify_id_token(id_token: str):
    """
    Verify Firebase ID token and return decoded token
    
    Args:
        id_token: Firebase ID token from client
        
    Returns:
        dict: Decoded token with user information (uid, email, etc.)
        
    Raises:
        ValueError: If token is invalid or expired
    """
    try:
        initialize_firebase()
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise ValueError(f"Invalid token: {str(e)}")

def get_user_by_uid(uid: str):
    """
    Get Firebase user by UID
    
    Args:
        uid: Firebase user UID
        
    Returns:
        UserRecord: Firebase user record
    """
    try:
        initialize_firebase()
        return auth.get_user(uid)
    except Exception as e:
        logger.error(f"Failed to get user {uid}: {str(e)}")
        raise ValueError(f"User not found: {str(e)}")

# Initialize on import
initialize_firebase()
