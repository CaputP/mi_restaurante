import {
    readdir,
    stat
} from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const IMAGE_DIRECTORY = path.resolve(
    "src/assets/images"
);

const SOURCE_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png"
]);

async function listImages(directory) {
    const entries = await readdir(
        directory,
        {
            withFileTypes: true
        }
    );

    const images = [];

    for (const entry of entries) {
        const entryPath = path.join(
            directory,
            entry.name
        );

        if (entry.isDirectory()) {
            images.push(
                ...await listImages(entryPath)
            );
            continue;
        }

        if (
            SOURCE_EXTENSIONS.has(
                path.extname(entry.name).toLowerCase()
            )
        ) {
            images.push(entryPath);
        }
    }

    return images;
}

async function shouldOptimize(
    sourcePath,
    outputPath
) {
    try {
        const [source, output] =
            await Promise.all([
                stat(sourcePath),
                stat(outputPath)
            ]);

        return source.mtimeMs > output.mtimeMs;
    } catch {
        return true;
    }
}

const images =
    await listImages(
        IMAGE_DIRECTORY
    );

let optimized = 0;

for (const sourcePath of images) {
    const outputPath = sourcePath.replace(
        /\.(?:jpe?g|png)$/i,
        ".webp"
    );

    if (
        !await shouldOptimize(
            sourcePath,
            outputPath
        )
    ) {
        continue;
    }

    await sharp(sourcePath)
        .rotate()
        .resize({
            width: 1920,
            height: 1920,
            fit: "inside",
            withoutEnlargement: true
        })
        .webp({
            quality: 82,
            effort: 5,
            smartSubsample: true
        })
        .toFile(outputPath);

    optimized += 1;
}

console.log(
    `${optimized} imagen(es) optimizada(s).`
);
