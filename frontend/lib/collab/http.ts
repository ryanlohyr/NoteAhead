// A simple wrapper for fetch API
export function req(conf: {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
}): Promise<string> & { abort?: () => void } {
  const controller = new AbortController();
  let aborted = false;

  const result = new Promise<string>((resolve, reject) => {
    fetch(conf.url, {
      method: conf.method,
      headers: {
        ...conf.headers,
      },
      body: conf.body || undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (aborted) return;
        if (response.ok) {
          return response.text().then(resolve);
        } else {
          response.text().then((text) => {
            let message = text;
            if (text && /html/.test(response.headers.get("content-type") || "")) {
              message = makePlain(text);
            }
            const err = new Error(
              "Request failed: " + response.statusText + (message ? "\n\n" + message : "")
            ) as any;
            err.status = response.status;
            reject(err);
          });
        }
      })
      .catch((error) => {
        if (!aborted) {
          if (error.name === "AbortError") {
            reject(new Error("Request aborted"));
          } else {
            reject(new Error("Network error"));
          }
        }
      });
  }) as Promise<string> & { abort?: () => void };

  result.abort = () => {
    if (!aborted) {
      controller.abort();
      aborted = true;
    }
  };

  return result;
}

function makePlain(html: string): string {
  const elt = document.createElement("div");
  elt.innerHTML = html;
  return elt.textContent?.replace(/\n[^]*|\s+$/g, "") || "";
}

export function GET(url: string) {
  return req({ url, method: "GET" });
}

export function POST(url: string, body: string, type: string) {
  return req({ url, method: "POST", body, headers: { "Content-Type": type } });
}

