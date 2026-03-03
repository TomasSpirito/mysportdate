import { useParams } from "react-router-dom";

export const useTenantPath = () => {
  const { slug } = useParams<{ slug?: string }>();
  return (path: string) => slug ? `/predio/${slug}${path}` : path;
};
