import { useNavigate } from "react-router-dom";

export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  const withTransition = (callback: () => void) => {
    const documentWithTransition = document as Document & {
      startViewTransition?: (updateCallback: () => void) => void;
    };

    if (documentWithTransition.startViewTransition) {
      documentWithTransition.startViewTransition(callback);
      return;
    }

    callback();
  };

  const navigateTo = (to: string) => {
    withTransition(() => navigate(to));
  };

  const navigateBack = () => {
    withTransition(() => navigate(-1));
  };

  return { navigateTo, navigateBack };
}
