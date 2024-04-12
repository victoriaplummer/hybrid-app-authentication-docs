import "@code-hike/mdx/dist/index.css"
import Head from "next/head"
import "../global.css"
import "../custom-ch.css"

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
