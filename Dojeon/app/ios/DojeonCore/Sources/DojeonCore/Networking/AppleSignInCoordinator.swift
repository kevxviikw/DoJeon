import AuthenticationServices
import UIKit

/// Wraps `ASAuthorizationController` in an async call. This drives
/// Apple's own system sign-in sheet, not custom app UI, so it's included
/// here rather than left for the SwiftUI layer -- the button/screen that
/// triggers it is still yours to design.
@MainActor
public final class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<String, Error>?

    public override init() { super.init() }

    public func requestIdentityToken() async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let token = String(data: tokenData, encoding: .utf8)
        else {
            continuation?.resume(throwing: DojeonAuthError.requestFailed("No identity token in the Apple credential."))
            continuation = nil
            return
        }
        continuation?.resume(returning: token)
        continuation = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first ?? ASPresentationAnchor()
    }
}
