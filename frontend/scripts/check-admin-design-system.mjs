import {
    readdir,
    readFile
} from "node:fs/promises";
import path from "node:path";
import {
    fileURLToPath
} from "node:url";

const scriptDirectory =
    path.dirname(
        fileURLToPath(
            import.meta.url
        )
    );
const frontendDirectory =
    path.resolve(
        scriptDirectory,
        ".."
    );

const scanTargets = [
    "src/pages/admin",
    "src/components/adminSidebar",
    "src/components/adminMetricCard",
    "src/components/adminDialog",
    "src/components/operationalSidebar"
];

const standaloneFiles = [
    "src/layouts/AdminLayout.css",
    "src/layouts/operationalLayout.css"
];

const allowedBreakpoints =
    new Set([
        "1200",
        "850",
        "600"
    ]);

async function collectCssFiles(
    relativeDirectory
) {
    const absoluteDirectory =
        path.join(
            frontendDirectory,
            relativeDirectory
        );
    const entries =
        await readdir(
            absoluteDirectory,
            {
                withFileTypes: true
            }
        );
    const files = [];

    for (const entry of entries) {
        const relativePath =
            path.join(
                relativeDirectory,
                entry.name
            );

        if (entry.isDirectory()) {
            files.push(
                ...await collectCssFiles(
                    relativePath
                )
            );
        } else if (
            entry.name.endsWith(
                ".css"
            )
        ) {
            files.push(
                relativePath
            );
        }
    }

    return files;
}

async function collectSourceFiles(
    relativeDirectory
) {
    const absoluteDirectory =
        path.join(
            frontendDirectory,
            relativeDirectory
        );
    const entries =
        await readdir(
            absoluteDirectory,
            {
                withFileTypes: true
            }
        );
    const files = [];

    for (const entry of entries) {
        const relativePath =
            path.join(
                relativeDirectory,
                entry.name
            );

        if (entry.isDirectory()) {
            files.push(
                ...await collectSourceFiles(
                    relativePath
                )
            );
        } else if (
            /\.(?:js|jsx)$/.test(
                entry.name
            )
        ) {
            files.push(
                relativePath
            );
        }
    }

    return files;
}

const cssFiles = [
    ...(
        await Promise.all(
            scanTargets.map(
                collectCssFiles
            )
        )
    ).flat(),
    ...standaloneFiles
];

const designSystemSource =
    await readFile(
        path.join(
            frontendDirectory,
            "src/styles/adminDesignSystem.css"
        ),
        "utf8"
    );
const definedTokens =
    new Set(
        Array.from(
            designSystemSource.matchAll(
                /(--admin-[a-z0-9-]+)\s*:/gi
            ),
            (match) => match[1]
        )
    );

const violations = [];

for (const relativeFile of cssFiles) {
    const source =
        await readFile(
            path.join(
                frontendDirectory,
                relativeFile
            ),
            "utf8"
        );

    const lines =
        source.split(
            /\r?\n/
        );

    lines.forEach(
        (line, index) => {
            if (
                /#[0-9a-f]{3,8}\b/i.test(
                    line
                )
            ) {
                violations.push(
                    `${relativeFile}:${index + 1} contiene un color hexadecimal fuera de los tokens.`
                );
            }

            if (
                /rgba?\s*\(/i.test(
                    line
                )
            ) {
                violations.push(
                    `${relativeFile}:${index + 1} contiene un color RGB fuera de los tokens.`
                );
            }

            if (
                /font-size:\s*[0-9.]+rem\b/i.test(
                    line
                )
            ) {
                violations.push(
                    `${relativeFile}:${index + 1} contiene un tamaño tipográfico fuera de la escala.`
                );
            }

            const breakpoint =
                line.match(
                    /@media\s*\(max-width:\s*(\d+)px\)/i
                );

            if (
                breakpoint &&
                !allowedBreakpoints.has(
                    breakpoint[1]
                )
            ) {
                violations.push(
                    `${relativeFile}:${index + 1} usa el breakpoint no permitido ${breakpoint[1]}px.`
                );
            }
        }
    );

    for (const match of source.matchAll(
        /var\((--admin-[a-z0-9-]+)/gi
    )) {
        if (
            !definedTokens.has(
                match[1]
            )
        ) {
            violations.push(
                `${relativeFile} usa el token no definido ${match[1]}.`
            );
        }
    }
}

const sourceFiles =
    await collectSourceFiles(
        "src"
    );

for (const relativeFile of sourceFiles) {
    const absoluteFile =
        path.join(
            frontendDirectory,
            relativeFile
        );
    const source =
        await readFile(
            absoluteFile,
            "utf8"
        );
    const directoryEntries =
        await readdir(
            path.dirname(
                absoluteFile
            )
        );

    for (const match of source.matchAll(
        /import\s+["'](\.\/[^"']+\.css)["']/g
    )) {
        const requestedName =
            path.basename(
                match[1]
            );
        const actualName =
            directoryEntries.find(
                (entry) =>
                    entry.toLowerCase() ===
                    requestedName.toLowerCase()
            );

        if (
            actualName &&
            actualName !== requestedName
        ) {
            violations.push(
                `${relativeFile} importa ${requestedName}, pero el archivo se llama ${actualName}.`
            );
        }
    }
}

if (violations.length > 0) {
    console.error(
        "Se encontraron desviaciones del sistema de diseño:\n"
    );
    console.error(
        violations.join("\n")
    );
    process.exitCode = 1;
} else {
    console.log(
        `Sistema de diseño validado en ${cssFiles.length} archivos CSS.`
    );
}
