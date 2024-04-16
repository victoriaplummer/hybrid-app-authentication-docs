import "@code-hike/mdx/dist/index.css"
import Head from "next/head"
import "../global.css"
import "../custom-ch.css"

const copyCode = () => {
  const codeBlock = document.getElementById('code-block');
  const text = codeBlock.textContent.trim(); // Get the text content without leading/trailing spaces

  // Remove leading $ symbol if present
  const textWithoutDollar = text.startsWith('$ ') ? text.substring(2) : text;

  // Copy text to clipboard
  navigator.clipboard.writeText(textWithoutDollar)

}

export {copyCode}

function MyApp({ Component, pageProps }) {
  return (
    <div>
      <Head>
        <title>Not Stripe Docs | Code Hike Demo</title>
      </Head>
      <article>
        <div>
          <Component {...pageProps} />
        </div>
      </article>
    </div>
  )
}

export default MyApp
