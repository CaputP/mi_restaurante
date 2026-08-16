import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import {
    listAvailableLoyaltyProgramsRequest
} from "../src/services/loyalty.service";
import {
    listAvailablePromotionsRequest
} from "../src/services/promotions.service";

const {
    apiRequestMock
} = vi.hoisted(
    () => ({
        apiRequestMock: vi.fn()
    })
);

vi.mock(
    "../src/services/api",
    () => ({
        apiRequest: apiRequestMock
    })
);

describe("servicios del catálogo de beneficios", () => {
    beforeEach(() => {
        apiRequestMock.mockReset();
    });

    it("consulta los programas vigentes con la sesión del cliente", async () => {
        const signal =
            new AbortController().signal;

        apiRequestMock.mockResolvedValue({
            data: {
                programas: [],
                total: 0
            }
        });

        await listAvailableLoyaltyProgramsRequest(
            "token-cliente",
            signal
        );

        expect(apiRequestMock).toHaveBeenCalledWith(
            "/loyalty/programs/available",
            {
                token: "token-cliente",
                signal
            }
        );
    });

    it("consulta las promociones vigentes con la sesión del cliente", async () => {
        const signal =
            new AbortController().signal;

        apiRequestMock.mockResolvedValue({
            data: {
                promociones: [],
                total: 0
            }
        });

        await listAvailablePromotionsRequest(
            "token-cliente",
            signal
        );

        expect(apiRequestMock).toHaveBeenCalledWith(
            "/promotions/available",
            {
                token: "token-cliente",
                signal
            }
        );
    });
});
