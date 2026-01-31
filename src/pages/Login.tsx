export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-red-500 mb-4">Tesla Strava</h1>
          <p className="text-slate-400 text-lg">
            Track your Tesla journeys like never before
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Connect Your Tesla</h2>
              <p className="text-slate-400 text-sm">
                Sign in with your Tesla account to start tracking your drives,
                charging sessions, and more.
              </p>
            </div>

            <a
              href="/auth/login"
              className="block w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
            >
              Connect with Tesla
            </a>

            <p className="text-xs text-slate-500 text-center">
              By connecting, you agree to share your vehicle data with this
              application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
