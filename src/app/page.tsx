"use client";

import Head from "next/head";
import dynamic from "next/dynamic";

const ARScene = dynamic(() => import("../components/ARScene"), { ssr: false });

const Home: React.FC = () => {
    return (
        <>
            <Head>
                <title>AR with Next.js</title>
                <meta
                    name="description"
                    content="Augmented Reality with WebXR and Three.js"
                />
            </Head>
            <main>
                <h1>AR Example with WebXR</h1>
                <ARScene />
            </main>
        </>
    );
};

export default Home;