import { useQuery } from "@tanstack/react-query";
import { fetchWrapper, makeApiUrl } from "@/lib/api";

interface HelloResponse {
  message: string;
  timestamp: string;
  status: string;
}

export const useHelloQuery = () => {
  return useQuery({
    queryKey: ["hello"],
    queryFn: () => fetchWrapper<HelloResponse>(makeApiUrl("/api/hello")),
  });
};

