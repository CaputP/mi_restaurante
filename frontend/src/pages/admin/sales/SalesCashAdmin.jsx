import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaCashRegister,
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaCoins,
    FaCreditCard,
    FaEye,
    FaMoneyBillWave,
    FaPlus,
    FaReceipt,
    FaSave,
    FaSearch,
    FaSyncAlt,
    FaTimes,
    FaWallet,
    FaBan,
    FaFileInvoiceDollar,
    FaTag,
    FaPrint,
    FaGift,
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    useNavigate
} from "react-router-dom";

import {
    ApiError
} from "../../../services/api";

import {
    closeCashRegisterRequest,
    getCashOptionsRequest,
    getCashRegisterByIdRequest,
    getCurrentCashRequest,
    listCashRegistersRequest,
    openCashRegisterRequest
} from "../../../services/cash.service";

import {
    createSaleRequest,
    getSaleByIdRequest,
    getSaleOptionsRequest,
    listSalesRequest
} from "../../../services/sale.service";

import {
    createExpenseCategoryRequest,
    createExpenseRequest,
    getExpenseByIdRequest,
    getExpenseOptionsRequest,
    listExpensesRequest,
    voidExpenseRequest
} from "../../../services/expense.service";

import {
    previewAutomaticPromotionsRequest
} from "../../../services/promotions.service";

import {
    getLoyaltyRedemptionOptionsRequest,
    previewLoyaltyRedemptionRequest
} from "../../../services/loyalty.service";

import "./salesCashAdmin.css";

const EMPTY_CASH_OPTIONS = {
    sucursales: [],
    vendedores: [],
    estados: [],
    sucursalSeleccionadaId: null,
    vendedorActualId: null
};

const EMPTY_SALE_OPTIONS = {
    sucursales: [],
    cajas: [],
    pedidos: [],
    metodosPago: []
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

const EMPTY_EXPENSE_OPTIONS = {
    sucursales: [],
    categorias: [],
    cajas: [],
    metodosPago: [],
    sucursalSeleccionadaId: null
};

function getTodayInputValue() {
    return new Date().toLocaleDateString(
        "en-CA",
        {
            timeZone: "America/Lima"
        }
    );
}

function createPaymentRow(
    amount = 0
) {
    return {
        id:
            `${Date.now()}-${Math.random()}`,

        metodoPago:
            "EFECTIVO",

        monto:
            amount > 0
                ? amount.toFixed(2)
                : "",

        numeroOperacion: "",

        montoRecibido:
            amount > 0
                ? amount.toFixed(2)
                : ""
    };
}


function isAbortError(error) {
    return (
        error?.name ===
        "AbortError"
    );
}


function getErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const validationMessage =
        error.errors?.[0]?.mensaje;

    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error.message;
}

function numberValue(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

function roundMoney(value) {
    return Number(
        value.toFixed(2)
    );
}

function getPromotionalDiscount(
    sale
) {
    if (!sale) {
        return 0;
    }

    return roundMoney(
        (
            sale.promocionesAplicadas ??
            []
        ).reduce(
            (
                total,
                promotion
            ) =>
                total +
                numberValue(
                    promotion
                        .montoDescuento
                ),
            0
        )
    );
}

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN"
        }
    ).format(
        numberValue(value)
    );
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(
        value
    ).toLocaleString(
        "es-PE",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

function formatLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function SalesCashAdmin() {
    const {
        token,
        usuario
    } = useAuth();

    const navigate =
        useNavigate();

    const [
        activeTab,
        setActiveTab
    ] = useState("COBROS");

    const [
        cashOptions,
        setCashOptions
    ] = useState(
        EMPTY_CASH_OPTIONS
    );

    const [
        saleOptions,
        setSaleOptions
    ] = useState(
        EMPTY_SALE_OPTIONS
    );

    const [
        selectedBranchId,
        setSelectedBranchId
    ] = useState("");

    const [
        selectedSellerId,
        setSelectedSellerId
    ] = useState("");

    const [
        currentCash,
        setCurrentCash
    ] = useState(null);

    const [
        cashRegisters,
        setCashRegisters
    ] = useState([]);

    const [
        cashPagination,
        setCashPagination
    ] = useState(
        EMPTY_PAGINATION
    );

    const [
        cashPage,
        setCashPage
    ] = useState(1);

    const [
        cashState,
        setCashState
    ] = useState("TODOS");

    const [
        selectedCashDetail,
        setSelectedCashDetail
    ] = useState(null);

    const [
        sales,
        setSales
    ] = useState([]);

    const [
        salePagination,
        setSalePagination
    ] = useState(
        EMPTY_PAGINATION
    );

    const [
        salePage,
        setSalePage
    ] = useState(1);

    const [
        saleSearch,
        setSaleSearch
    ] = useState("");

    const [
        appliedSaleSearch,
        setAppliedSaleSearch
    ] = useState("");

    const [
        saleState,
        setSaleState
    ] = useState("TODOS");

    const [
        selectedOrderId,
        setSelectedOrderId
    ] = useState("");

    const [
        promotionPreview,
        setPromotionPreview
    ] = useState(null);

    const [
        loyaltyRedemptionOptions,
        setLoyaltyRedemptionOptions
    ] = useState({
        pedidoId: null,
        cliente: null,
        premios: []
    });

    const [
        selectedRewardIds,
        setSelectedRewardIds
    ] = useState([]);

    const [
        loyaltyRedemptionPreview,
        setLoyaltyRedemptionPreview
    ] = useState(null);

    const [
        isLoadingRewards,
        setIsLoadingRewards
    ] = useState(false);

    const [
        isLoadingRewardPreview,
        setIsLoadingRewardPreview
    ] = useState(false);

    const [
        isLoadingPromotionPreview,
        setIsLoadingPromotionPreview
    ] = useState(false);

    const [
        autoBalancePayment,
        setAutoBalancePayment
    ] = useState(true);

    const [
        selectedSale,
        setSelectedSale
    ] = useState(null);

    const [
        openCashForm,
        setOpenCashForm
    ] = useState({
        montoInicial: "0.00",
        observaciones: ""
    });

    const [
        closeCashForm,
        setCloseCashForm
    ] = useState({
        efectivoContado: "",
        observaciones: ""
    });

    const [
        saleForm,
        setSaleForm
    ] = useState({
        cajaId: "",
        nombreCliente: "",
        descuento: "0.00",
        propina: "0.00",
        observaciones: "",
        pagos: []
    });

    const [
        isLoadingInitial,
        setIsLoadingInitial
    ] = useState(true);

    const [
        isLoadingData,
        setIsLoadingData
    ] = useState(false);

    const [
        isLoadingCurrentCash,
        setIsLoadingCurrentCash
    ] = useState(false);

    const [
        isLoadingDetail,
        setIsLoadingDetail
    ] = useState(false);

    const [
        isSaving,
        setIsSaving
    ] = useState(false);

    const [
        reloadKey,
        setReloadKey
    ] = useState(0);

    const [
        message,
        setMessage
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");

    const [
        expenseOptions,
        setExpenseOptions
    ] = useState(
        EMPTY_EXPENSE_OPTIONS
    );

    const [
        expenses,
        setExpenses
    ] = useState([]);

    const [
        expensePagination,
        setExpensePagination
    ] = useState(
        EMPTY_PAGINATION
    );

    const [
        expensePage,
        setExpensePage
    ] = useState(1);

    const [
        expenseSearch,
        setExpenseSearch
    ] = useState("");

    const [
        appliedExpenseSearch,
        setAppliedExpenseSearch
    ] = useState("");

    const [
        expenseFilters,
        setExpenseFilters
    ] = useState({
        categoriaGastoId: "",
        metodoPago: "",
        estado: "TODOS",
        salioDeCaja: "TODOS"
    });

    const [
        expenseForm,
        setExpenseForm
    ] = useState({
        categoriaGastoId: "",
        descripcion: "",
        monto: "",
        metodoPago: "EFECTIVO",
        salioDeCaja: false,
        cajaId: "",
        comprobanteUrl: "",
        fechaGasto:
            getTodayInputValue()
    });

    const [
        categoryForm,
        setCategoryForm
    ] = useState({
        nombre: "",
        descripcion: ""
    });

    const [
        showCategoryForm,
        setShowCategoryForm
    ] = useState(false);

    const [
        selectedExpense,
        setSelectedExpense
    ] = useState(null);

    const selectedOrder =
        useMemo(
            () =>
                saleOptions.pedidos.find(
                    (order) =>
                        order.id ===
                        selectedOrderId
                ) ?? null,
            [
                saleOptions.pedidos,
                selectedOrderId
            ]
        );

    const subtotal =
        selectedOrder?.subtotal ?? 0;

    /*
     * Este valor corresponde únicamente al descuento
     * manual ingresado por el vendedor.
     */
    const discount =
        numberValue(
            saleForm.descuento
        );

    /*
     * Este valor proviene del cálculo realizado por
     * el backend.
     */
    const automaticDiscount =
        numberValue(
            promotionPreview
                ?.descuentoTotal
        );

    const rewardDiscount =
        numberValue(
            loyaltyRedemptionPreview
                ?.descuentoPremios
        );

    const totalDiscount =
        roundMoney(
            discount +
            automaticDiscount +
            rewardDiscount
        );

    const tip =
        numberValue(
            saleForm.propina
        );

    const saleTotal =
        useMemo(
            () =>
                roundMoney(
                    Math.max(
                        0,
                        subtotal -
                        totalDiscount +
                        tip
                    )
                ),
            [
                subtotal,
                totalDiscount,
                tip
            ]
        );

    const reservationAdvance =
        selectedOrder?.reserva
            ?.adelantoPagado ?? 0;

    const appliedAdvance =
        roundMoney(
            Math.min(
                saleTotal,
                Math.max(
                    0,
                    reservationAdvance
                )
            )
        );

    const amountToCharge =
        roundMoney(
            Math.max(
                0,
                saleTotal -
                appliedAdvance
            )
        );

    const paymentsTotal =
        roundMoney(
            saleForm.pagos.reduce(
                (
                    total,
                    payment
                ) =>
                    total +
                    numberValue(
                        payment.monto
                    ),
                0
            )
        );

    const pendingAmount =
        roundMoney(
            amountToCharge -
            paymentsTotal
        );

    const selectedSalePromotionalDiscount =
        useMemo(
            () =>
                getPromotionalDiscount(
                    selectedSale
                ),
            [
                selectedSale
            ]
        );

    const selectedSaleRewardDiscount =
        useMemo(
            () =>
                roundMoney(
                    (
                        selectedSale
                            ?.canjesPremios ??
                        []
                    ).reduce(
                        (
                            total,
                            redemption
                        ) =>
                            total +
                            numberValue(
                                redemption
                                    .montoAplicado
                            ),
                        0
                    )
                ),
            [
                selectedSale
            ]
        );

    const selectedSaleManualDiscount =
        useMemo(
            () =>
                roundMoney(
                    Math.max(
                        0,

                        numberValue(
                            selectedSale
                                ?.descuento
                        ) -
                        selectedSalePromotionalDiscount -
                        selectedSaleRewardDiscount
                    )
                ),
            [
                selectedSale,
                selectedSalePromotionalDiscount,
                selectedSaleRewardDiscount
            ]
        );

    useEffect(() => {
        if (
            !selectedOrder ||
            !promotionPreview ||
            !autoBalancePayment ||
            isLoadingRewardPreview
        ) {
            return;
        }

        if (
            selectedRewardIds.length >
            0 &&
            !loyaltyRedemptionPreview
        ) {
            return;
        }

        setSaleForm(
            (previous) => {
                if (
                    amountToCharge <= 0
                ) {
                    if (
                        previous.pagos
                            .length === 0
                    ) {
                        return previous;
                    }

                    return {
                        ...previous,
                        pagos: []
                    };
                }

                /*
                 * Cuando ya existe pago mixto,
                 * respetamos los montos ingresados
                 * manualmente.
                 */
                if (
                    previous.pagos
                        .length > 1
                ) {
                    return previous;
                }

                const currentPayment =
                    previous.pagos[0] ??
                    createPaymentRow(
                        amountToCharge
                    );

                const amountText =
                    amountToCharge.toFixed(
                        2
                    );

                const received =
                    numberValue(
                        currentPayment
                            .montoRecibido
                    );

                const receivedText =
                    currentPayment
                        .metodoPago ===
                        "EFECTIVO"
                        ? Math.max(
                            received,
                            amountToCharge
                        ).toFixed(2)
                        : "";

                if (
                    previous.pagos
                        .length === 1 &&
                    currentPayment.monto ===
                    amountText &&
                    currentPayment
                        .montoRecibido ===
                    receivedText
                ) {
                    return previous;
                }

                return {
                    ...previous,

                    pagos: [
                        {
                            ...currentPayment,

                            monto:
                                amountText,

                            montoRecibido:
                                receivedText
                        }
                    ]
                };
            }
        );
    }, [
        selectedOrder,
        promotionPreview,
        loyaltyRedemptionPreview,
        selectedRewardIds,
        isLoadingRewardPreview,
        amountToCharge,
        autoBalancePayment
    ]);

    const registeredExpenseTotal =
        useMemo(
            () =>
                expenses
                    .filter(
                        (expense) =>
                            expense.estado ===
                            "REGISTRADO"
                    )
                    .reduce(
                        (
                            total,
                            expense
                        ) =>
                            total +
                            numberValue(
                                expense.monto
                            ),
                        0
                    ),
            [expenses]
        );

    const cashExpenseTotal =
        useMemo(
            () =>
                expenses
                    .filter(
                        (expense) =>
                            expense.estado ===
                            "REGISTRADO" &&
                            expense.salioDeCaja
                    )
                    .reduce(
                        (
                            total,
                            expense
                        ) =>
                            total +
                            numberValue(
                                expense.monto
                            ),
                        0
                    ),
            [expenses]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadBranches() {
            setIsLoadingInitial(true);
            setError("");

            try {
                const result =
                    await getCashOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                setCashOptions(result);

                const branchId =
                    result
                        .sucursalSeleccionadaId ??
                    result
                        .sucursales[0]?.id ??
                    "";

                setSelectedBranchId(
                    branchId
                );
            } catch (requestError) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getErrorMessage(
                        requestError
                    ) ??
                    "No se pudieron cargar las sucursales."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingInitial(
                        false
                    );
                }
            }
        }

        void loadBranches();

        return () =>
            controller.abort();
    }, [token]);

    useEffect(() => {
        if (!selectedBranchId) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadData() {
            setIsLoadingData(true);

            try {
                const [
                    cashOptionsResult,
                    saleOptionsResult,
                    cashListResult,
                    salesListResult
                ] = await Promise.all([
                    getCashOptionsRequest(
                        token,
                        {
                            sucursalId:
                                selectedBranchId,

                            signal:
                                controller.signal
                        }
                    ),

                    getSaleOptionsRequest(
                        token,
                        {
                            sucursalId:
                                selectedBranchId,

                            signal:
                                controller.signal
                        }
                    ),

                    listCashRegistersRequest(
                        token,
                        {
                            sucursalId:
                                selectedBranchId,

                            estado:
                                cashState,

                            page:
                                cashPage,

                            limit: 20,

                            signal:
                                controller.signal
                        }
                    ),

                    listSalesRequest(
                        token,
                        {
                            search:
                                appliedSaleSearch,

                            sucursalId:
                                selectedBranchId,

                            estado:
                                saleState,

                            page:
                                salePage,

                            limit: 20,

                            signal:
                                controller.signal
                        }
                    )
                ]);

                setCashOptions(
                    cashOptionsResult
                );

                setSaleOptions(
                    saleOptionsResult
                );

                setCashRegisters(
                    cashListResult.cajas
                );

                setCashPagination(
                    cashListResult
                        .pagination
                );

                setSales(
                    salesListResult.ventas
                );

                setSalePagination(
                    salesListResult
                        .pagination
                );

                setSelectedSellerId(
                    (previous) => {
                        const previousExists =
                            cashOptionsResult
                                .vendedores
                                .some(
                                    (
                                        seller
                                    ) =>
                                        seller.id ===
                                        previous
                                );

                        if (
                            previousExists
                        ) {
                            return previous;
                        }

                        return (
                            cashOptionsResult
                                .vendedores
                                .find(
                                    (
                                        seller
                                    ) =>
                                        seller.id ===
                                        usuario.id
                                )?.id ??
                            cashOptionsResult
                                .vendedores[0]
                                ?.id ??
                            ""
                        );
                    }
                );

                setSaleForm(
                    (previous) => {
                        const cashExists =
                            saleOptionsResult
                                .cajas
                                .some(
                                    (
                                        cash
                                    ) =>
                                        cash.id ===
                                        previous
                                            .cajaId
                                );

                        return {
                            ...previous,

                            cajaId:
                                cashExists
                                    ? previous
                                        .cajaId
                                    : saleOptionsResult
                                        .cajas[0]
                                        ?.id ??
                                    ""
                        };
                    }
                );
            } catch (requestError) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getErrorMessage(
                        requestError
                    ) ??
                    "No se pudieron cargar ventas y cajas."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingData(
                        false
                    );
                }
            }
        }

        void loadData();

        return () =>
            controller.abort();
    }, [
        token,
        usuario.id,
        selectedBranchId,
        cashState,
        cashPage,
        saleState,
        salePage,
        appliedSaleSearch,
        reloadKey
    ]);

    useEffect(() => {
        if (
            !selectedBranchId ||
            !selectedSellerId
        ) {
            setCurrentCash(null);
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadCurrentCash() {
            setIsLoadingCurrentCash(
                true
            );

            try {
                const result =
                    await getCurrentCashRequest(
                        token,
                        {
                            sucursalId:
                                selectedBranchId,

                            vendedorId:
                                selectedSellerId,

                            signal:
                                controller.signal
                        }
                    );

                setCurrentCash(result);

                setCloseCashForm(
                    (previous) => ({
                        ...previous,

                        efectivoContado:
                            result
                                ? String(
                                    result
                                        .efectivoEsperado
                                )
                                : ""
                    })
                );
            } catch (requestError) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getErrorMessage(
                        requestError
                    ) ??
                    "No se pudo consultar la caja abierta."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingCurrentCash(
                        false
                    );
                }
            }
        }

        void loadCurrentCash();

        return () =>
            controller.abort();
    }, [
        token,
        selectedBranchId,
        selectedSellerId,
        reloadKey
    ]);

    useEffect(() => {
        if (!selectedBranchId) {
            setExpenseOptions(
                EMPTY_EXPENSE_OPTIONS
            );

            setExpenses([]);
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadExpenses() {
            try {
                const [
                    optionsResult,
                    listResult
                ] = await Promise.all([
                    getExpenseOptionsRequest(
                        token,
                        {
                            sucursalId:
                                selectedBranchId,

                            signal:
                                controller.signal
                        }
                    ),

                    listExpensesRequest(
                        token,
                        {
                            search:
                                appliedExpenseSearch,

                            sucursalId:
                                selectedBranchId,

                            ...expenseFilters,

                            page:
                                expensePage,

                            limit: 20,

                            signal:
                                controller.signal
                        }
                    )
                ]);

                setExpenseOptions(
                    optionsResult
                );

                setExpenses(
                    listResult.gastos
                );

                setExpensePagination(
                    listResult.pagination
                );

                setExpenseForm(
                    (previous) => {
                        const categoryExists =
                            optionsResult
                                .categorias
                                .some(
                                    (
                                        category
                                    ) =>
                                        category.id ===
                                        previous
                                            .categoriaGastoId
                                );

                        const cashExists =
                            optionsResult
                                .cajas
                                .some(
                                    (cash) =>
                                        cash.id ===
                                        previous.cajaId
                                );

                        return {
                            ...previous,

                            categoriaGastoId:
                                categoryExists
                                    ? previous
                                        .categoriaGastoId
                                    : optionsResult
                                        .categorias[0]
                                        ?.id ??
                                    "",

                            cajaId:
                                previous
                                    .salioDeCaja
                                    ? cashExists
                                        ? previous
                                            .cajaId
                                        : optionsResult
                                            .cajas[0]
                                            ?.id ??
                                        ""
                                    : ""
                        };
                    }
                );
            } catch (requestError) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getErrorMessage(
                        requestError
                    ) ??
                    "No se pudieron cargar los gastos."
                );
            }
        }

        void loadExpenses();

        return () =>
            controller.abort();
    }, [
        token,
        selectedBranchId,
        expensePage,
        appliedExpenseSearch,
        expenseFilters,
        reloadKey
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function refreshData() {
        clearFeedback();

        setReloadKey(
            (value) =>
                value + 1
        );
    }

    function handleBranchChange(
        branchId
    ) {
        clearFeedback();

        setSelectedBranchId(
            branchId
        );

        setSelectedSellerId("");
        setSelectedOrderId("");
        setSelectedSale(null);
        setSelectedCashDetail(null);
        setCurrentCash(null);
        setCashPage(1);
        setSalePage(1);
        setSelectedExpense(null);
        setExpensePage(1);
        setExpenseSearch("");
        setAppliedExpenseSearch("");

        setExpenseFilters({
            categoriaGastoId: "",
            metodoPago: "",
            estado: "TODOS",
            salioDeCaja: "TODOS"
        });

        setExpenseForm({
            categoriaGastoId: "",
            descripcion: "",
            monto: "",
            metodoPago: "EFECTIVO",
            salioDeCaja: false,
            cajaId: "",
            comprobanteUrl: "",
            fechaGasto:
                getTodayInputValue()
        });
    }

    async function handleOpenCash(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (!selectedBranchId) {
            setError(
                "Selecciona una sucursal."
            );
            return;
        }

        if (!selectedSellerId) {
            setError(
                "Selecciona el responsable de caja."
            );
            return;
        }

        const initialAmount =
            numberValue(
                openCashForm
                    .montoInicial
            );

        if (initialAmount < 0) {
            setError(
                "El monto inicial no puede ser negativo."
            );
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await openCashRegisterRequest(
                    token,
                    {
                        sucursalId:
                            selectedBranchId,

                        vendedorId:
                            selectedSellerId,

                        montoInicial:
                            initialAmount,

                        observaciones:
                            openCashForm
                                .observaciones
                                .trim() ||
                            null
                    }
                );

            setCurrentCash(
                response.data.caja
            );

            setMessage(
                response.message
            );

            setOpenCashForm({
                montoInicial: "0.00",
                observaciones: ""
            });

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo abrir la caja."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCloseCash(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (!currentCash) {
            setError(
                "No existe una caja abierta."
            );
            return;
        }

        const countedCash =
            numberValue(
                closeCashForm
                    .efectivoContado
            );

        if (countedCash < 0) {
            setError(
                "El efectivo contado no puede ser negativo."
            );
            return;
        }

        const confirmed =
            window.confirm(
                `¿Cerrar la caja ${currentCash.codigo}?`
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await closeCashRegisterRequest(
                    token,
                    currentCash.id,
                    {
                        efectivoContado:
                            countedCash,

                        observaciones:
                            closeCashForm
                                .observaciones
                                .trim() ||
                            null
                    }
                );

            setSelectedCashDetail(
                response.data.caja
            );

            setCurrentCash(null);

            setMessage(
                response.message
            );

            setCloseCashForm({
                efectivoContado: "",
                observaciones: ""
            });

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo cerrar la caja."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function closeChargeForm() {
        setSelectedOrderId(
            ""
        );

        setPromotionPreview(
            null
        );

        setLoyaltyRedemptionOptions({
            pedidoId: null,
            cliente: null,
            premios: []
        });

        setSelectedRewardIds(
            []
        );

        setLoyaltyRedemptionPreview(
            null
        );

        setIsLoadingPromotionPreview(
            false
        );

        setIsLoadingRewards(
            false
        );

        setIsLoadingRewardPreview(
            false
        );

        setAutoBalancePayment(
            true
        );
    }

    async function handleSelectOrder(
        orderId
    ) {
        clearFeedback();

        const order =
            saleOptions.pedidos.find(
                (item) =>
                    item.id ===
                    orderId
            );

        if (!order) {
            setError(
                "El pedido seleccionado ya no está disponible."
            );
            return;
        }

        setSelectedOrderId(
            orderId
        );

        setPromotionPreview(
            null
        );

        setLoyaltyRedemptionPreview(
            null
        );

        setSelectedRewardIds(
            []
        );

        setLoyaltyRedemptionOptions({
            pedidoId:
                order.id,

            cliente:
                order.cliente
                    ? {
                        id:
                            order.cliente.id,

                        nombreCompleto:
                            order.cliente
                                .nombreCompleto
                    }
                    : null,

            premios: []
        });

        setAutoBalancePayment(
            true
        );

        setSaleForm(
            (previous) => ({
                ...previous,

                nombreCliente:
                    order.cliente
                        ?.nombreCompleto ??
                    "Público general",

                descuento:
                    "0.00",

                propina:
                    "0.00",

                observaciones:
                    "",

                pagos:
                    []
            })
        );

        setIsLoadingPromotionPreview(
            true
        );

        setIsLoadingRewards(
            true
        );

        try {
            const [
                promotionResult,
                rewardsResult
            ] =
                await Promise.all([
                    previewAutomaticPromotionsRequest(
                        token,
                        order.id
                    ),

                    getLoyaltyRedemptionOptionsRequest(
                        token,
                        order.id
                    )
                ]);

            setPromotionPreview(
                promotionResult
            );

            setLoyaltyRedemptionOptions(
                rewardsResult
            );
        } catch (requestError) {
            setPromotionPreview(
                null
            );

            setLoyaltyRedemptionOptions({
                pedidoId:
                    order.id,

                cliente:
                    order.cliente
                        ? {
                            id:
                                order.cliente.id,

                            nombreCompleto:
                                order.cliente
                                    .nombreCompleto
                        }
                        : null,

                premios: []
            });

            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudieron preparar las promociones y premios del pedido."
            );
        } finally {
            setIsLoadingPromotionPreview(
                false
            );

            setIsLoadingRewards(
                false
            );
        }
    }

    async function updateSelectedRewards(
        nextRewardIds
    ) {
        setSelectedRewardIds(
            nextRewardIds
        );

        setAutoBalancePayment(
            true
        );

        if (
            !selectedOrder
        ) {
            setLoyaltyRedemptionPreview(
                null
            );
            return;
        }

        if (
            nextRewardIds.length ===
            0
        ) {
            setLoyaltyRedemptionPreview(
                null
            );
            return;
        }

        setIsLoadingRewardPreview(
            true
        );

        setLoyaltyRedemptionPreview(
            null
        );

        try {
            const result =
                await previewLoyaltyRedemptionRequest(
                    token,
                    {
                        pedidoId:
                            selectedOrder.id,

                        premioIds:
                            nextRewardIds
                    }
                );

            setLoyaltyRedemptionPreview(
                result
            );
        } catch (requestError) {
            setSelectedRewardIds(
                []
            );

            setLoyaltyRedemptionPreview(
                null
            );

            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudieron aplicar los premios seleccionados."
            );
        } finally {
            setIsLoadingRewardPreview(
                false
            );
        }
    }

    function toggleReward(
        rewardId
    ) {
        const isSelected =
            selectedRewardIds.includes(
                rewardId
            );

        const nextRewardIds =
            isSelected
                ? selectedRewardIds.filter(
                    (id) =>
                        id !==
                        rewardId
                )
                : [
                    ...selectedRewardIds,
                    rewardId
                ];

        void updateSelectedRewards(
            nextRewardIds
        );
    }

    function clearSelectedRewards() {
        void updateSelectedRewards(
            []
        );
    }

    function addPayment() {
        setAutoBalancePayment(
            false
        );
        setSaleForm(
            (previous) => ({
                ...previous,

                pagos: [
                    ...previous.pagos,
                    createPaymentRow(
                        Math.max(
                            0,
                            pendingAmount
                        )
                    )
                ]
            })
        );
    }

    function updatePayment(
        paymentId,
        field,
        value
    ) {
        if (
            field === "monto"
        ) {
            setAutoBalancePayment(
                false
            );
        }

        setSaleForm(
            (previous) => ({
                ...previous,

                pagos:
                    previous.pagos.map(
                        (payment) => {
                            if (
                                payment.id !==
                                paymentId
                            ) {
                                return payment;
                            }

                            if (
                                field ===
                                "metodoPago"
                            ) {
                                return {
                                    ...payment,

                                    metodoPago:
                                        value,

                                    numeroOperacion:
                                        value ===
                                            "EFECTIVO"
                                            ? ""
                                            : payment
                                                .numeroOperacion,

                                    montoRecibido:
                                        value ===
                                            "EFECTIVO"
                                            ? payment
                                                .monto
                                            : ""
                                };
                            }

                            return {
                                ...payment,
                                [field]:
                                    value
                            };
                        }
                    )
            })
        );
    }

    function removePayment(
        paymentId
    ) {
        setAutoBalancePayment(
            false
        );

        setSaleForm(
            (previous) => ({
                ...previous,

                pagos:
                    previous.pagos.filter(
                        (payment) =>
                            payment.id !==
                            paymentId
                    )
            })
        );
    }

    function validateSale() {
        if (!selectedOrder) {
            return "Selecciona un pedido entregado.";
        }

        if (
            isLoadingPromotionPreview
        ) {
            return "Espera mientras se calculan las promociones.";
        }

        if (
            !promotionPreview ||
            promotionPreview.pedidoId !==
            selectedOrder.id
        ) {
            return "No se pudo validar el cálculo promocional del pedido.";
        }

        if (
            isLoadingRewards ||
            isLoadingRewardPreview
        ) {
            return "Espera mientras se validan los premios del cliente.";
        }

        if (
            selectedRewardIds.length >
            0 &&
            !loyaltyRedemptionPreview
        ) {
            return "Los premios seleccionados todavía no fueron validados.";
        }

        if (
            loyaltyRedemptionPreview &&
            loyaltyRedemptionPreview.pedidoId !==
            selectedOrder.id
        ) {
            return "El cálculo de premios no corresponde al pedido seleccionado.";
        }

        if (!saleForm.cajaId) {
            return "Selecciona una caja abierta.";
        }

        if (
            totalDiscount >
            subtotal + 0.01
        ) {
            return "La suma de promociones, premios y descuento manual no puede superar el subtotal.";
        }

        if (
            Math.abs(
                paymentsTotal -
                amountToCharge
            ) > 0.01
        ) {
            return `Los pagos deben sumar ${formatMoney(
                amountToCharge
            )}.`;
        }

        for (
            const payment
            of saleForm.pagos
        ) {
            const paymentAmount =
                numberValue(
                    payment.monto
                );

            if (paymentAmount <= 0) {
                return "Todos los pagos deben ser mayores que cero.";
            }

            if (
                payment.metodoPago !==
                "EFECTIVO" &&
                !payment.numeroOperacion
                    .trim()
            ) {
                return "Ingresa el número de operación del pago electrónico.";
            }

            if (
                payment.metodoPago ===
                "EFECTIVO"
            ) {
                const received =
                    numberValue(
                        payment
                            .montoRecibido
                    );

                if (
                    received <
                    paymentAmount
                ) {
                    return "El efectivo recibido no puede ser menor que el pago.";
                }
            }
        }

        return null;
    }

    async function handleCreateSale(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        const validationError =
            validateSale();

        if (validationError) {
            setError(
                validationError
            );
            return;
        }

        const confirmed =
            window.confirm(
                `¿Registrar el cobro del pedido ${selectedOrder.codigo}?`
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await createSaleRequest(
                    token,
                    {
                        pedidoId:
                            selectedOrder.id,

                        cajaId:
                            saleForm.cajaId,

                        nombreCliente:
                            saleForm
                                .nombreCliente
                                .trim() ||
                            null,

                        descuento:
                            discount,

                        propina:
                            tip,

                        premioIds:
                            selectedRewardIds,

                        observaciones:
                            saleForm
                                .observaciones
                                .trim() ||
                            null,

                        pagos:
                            saleForm.pagos.map(
                                (
                                    payment
                                ) => ({
                                    metodoPago:
                                        payment
                                            .metodoPago,

                                    monto:
                                        numberValue(
                                            payment
                                                .monto
                                        ),

                                    numeroOperacion:
                                        payment
                                            .numeroOperacion
                                            .trim() ||
                                        null,

                                    montoRecibido:
                                        payment
                                            .metodoPago ===
                                            "EFECTIVO"
                                            ? numberValue(
                                                payment
                                                    .montoRecibido
                                            )
                                            : null
                                })
                            )
                    }
                );

            setSelectedSale(
                response.data.venta
            );

            setSelectedOrderId("");

            setPromotionPreview(
                null
            );

            setAutoBalancePayment(
                true
            );

            setLoyaltyRedemptionOptions({
                pedidoId: null,
                cliente: null,
                premios: []
            });

            setSelectedRewardIds(
                []
            );

            setLoyaltyRedemptionPreview(
                null
            );

            setSaleForm(
                (previous) => ({
                    ...previous,

                    nombreCliente: "",
                    descuento: "0.00",
                    propina: "0.00",
                    observaciones: "",
                    pagos: []
                })
            );

            setMessage(
                response.message
            );

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo registrar la venta."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function openSaleDetail(
        saleId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const result =
                await getSaleByIdRequest(
                    token,
                    saleId
                );

            setSelectedSale(result);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo cargar la venta."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function openCashDetail(
        cashId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const result =
                await getCashRegisterByIdRequest(
                    token,
                    cashId
                );

            setSelectedCashDetail(
                result
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo cargar la caja."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    function handleSaleSearch(
        event
    ) {
        event.preventDefault();

        setSalePage(1);

        setAppliedSaleSearch(
            saleSearch.trim()
        );
    }

    function handleExpenseFieldChange(
        field,
        value
    ) {
        setExpenseForm(
            (previous) => {
                if (
                    field ===
                    "salioDeCaja"
                ) {
                    const checked =
                        Boolean(value);

                    return {
                        ...previous,

                        salioDeCaja:
                            checked,

                        metodoPago:
                            checked
                                ? "EFECTIVO"
                                : previous
                                    .metodoPago,

                        cajaId:
                            checked
                                ? previous
                                    .cajaId ||
                                expenseOptions
                                    .cajas[0]
                                    ?.id ||
                                ""
                                : ""
                    };
                }

                return {
                    ...previous,
                    [field]: value
                };
            }
        );
    }

    async function handleCreateExpenseCategory(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        const categoryName =
            categoryForm.nombre.trim();

        if (
            categoryName.length < 2
        ) {
            setError(
                "El nombre de la categoría debe contener al menos 2 caracteres."
            );
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await createExpenseCategoryRequest(
                    token,
                    {
                        nombre:
                            categoryName,

                        descripcion:
                            categoryForm
                                .descripcion
                                .trim() ||
                            null
                    }
                );

            const category =
                response.data.categoria;

            setExpenseOptions(
                (previous) => ({
                    ...previous,

                    categorias: [
                        ...previous
                            .categorias,
                        category
                    ].sort(
                        (
                            categoryA,
                            categoryB
                        ) =>
                            categoryA.nombre.localeCompare(
                                categoryB.nombre,
                                "es"
                            )
                    )
                })
            );

            setExpenseForm(
                (previous) => ({
                    ...previous,

                    categoriaGastoId:
                        category.id
                })
            );

            setCategoryForm({
                nombre: "",
                descripcion: ""
            });

            setShowCategoryForm(
                false
            );

            setMessage(
                response.message
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo crear la categoría."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCreateExpense(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (
            !expenseForm
                .categoriaGastoId
        ) {
            setError(
                "Selecciona una categoría."
            );
            return;
        }

        if (
            expenseForm
                .descripcion
                .trim()
                .length < 3
        ) {
            setError(
                "La descripción debe contener al menos 3 caracteres."
            );
            return;
        }

        const amount =
            numberValue(
                expenseForm.monto
            );

        if (amount <= 0) {
            setError(
                "El monto debe ser mayor que cero."
            );
            return;
        }

        if (
            expenseForm
                .salioDeCaja &&
            !expenseForm.cajaId
        ) {
            setError(
                "Selecciona la caja de donde salió el dinero."
            );
            return;
        }

        const confirmed =
            window.confirm(
                `¿Registrar el gasto de ${formatMoney(
                    amount
                )}?`
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await createExpenseRequest(
                    token,
                    {
                        sucursalId:
                            selectedBranchId,

                        categoriaGastoId:
                            expenseForm
                                .categoriaGastoId,

                        cajaId:
                            expenseForm
                                .salioDeCaja
                                ? expenseForm
                                    .cajaId
                                : null,

                        descripcion:
                            expenseForm
                                .descripcion
                                .trim(),

                        monto:
                            amount,

                        metodoPago:
                            expenseForm
                                .metodoPago,

                        salioDeCaja:
                            expenseForm
                                .salioDeCaja,

                        comprobanteUrl:
                            expenseForm
                                .comprobanteUrl
                                .trim() ||
                            null,

                        fechaGasto:
                            expenseForm
                                .fechaGasto ||
                            null
                    }
                );

            setSelectedExpense(
                response.data.gasto
            );

            setExpenseForm(
                (previous) => ({
                    ...previous,

                    descripcion: "",
                    monto: "",
                    metodoPago:
                        "EFECTIVO",

                    salioDeCaja:
                        false,

                    cajaId: "",

                    comprobanteUrl:
                        "",

                    fechaGasto:
                        getTodayInputValue()
                })
            );

            setMessage(
                response.message
            );

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo registrar el gasto."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function handleExpenseSearch(
        event
    ) {
        event.preventDefault();

        setExpensePage(1);

        setAppliedExpenseSearch(
            expenseSearch.trim()
        );
    }

    async function openExpenseDetail(
        expenseId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const result =
                await getExpenseByIdRequest(
                    token,
                    expenseId
                );

            setSelectedExpense(
                result
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo cargar el gasto."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function handleVoidExpense() {
        if (!selectedExpense) {
            return;
        }

        const reason =
            window.prompt(
                "Ingresa el motivo de anulación:"
            );

        if (reason === null) {
            return;
        }

        const cleanReason =
            reason.trim();

        if (
            cleanReason.length < 5
        ) {
            setError(
                "El motivo debe contener al menos 5 caracteres."
            );
            return;
        }

        const confirmed =
            window.confirm(
                `¿Anular el gasto de ${formatMoney(
                    selectedExpense.monto
                )}?`
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await voidExpenseRequest(
                    token,
                    selectedExpense.id,
                    {
                        motivo:
                            cleanReason
                    }
                );

            setSelectedExpense(
                response.data.gasto
            );

            setMessage(
                response.message
            );

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo anular el gasto."
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoadingInitial) {
        return (
            <div className="sales-cash-loading">
                <FaCashRegister />
                Cargando ventas y caja...
            </div>
        );
    }

    return (
        <section className="sales-cash-admin">
            <header className="sales-cash-heading">
                <div>
                    <span className="admin-eyebrow">
                        VENTAS Y CAJA
                    </span>

                    <h2>
                        Cobros y control de caja
                    </h2>

                    <p>
                        Registra pagos, genera
                        tickets y realiza aperturas
                        y cierres de caja.
                    </p>
                </div>

                <div className="sales-heading-actions">
                    <select
                        value={
                            selectedBranchId
                        }
                        onChange={(
                            event
                        ) =>
                            handleBranchChange(
                                event.target
                                    .value
                            )
                        }
                    >
                        {cashOptions.sucursales.map(
                            (branch) => (
                                <option
                                    key={
                                        branch.id
                                    }
                                    value={
                                        branch.id
                                    }
                                >
                                    {
                                        branch.nombre
                                    }
                                </option>
                            )
                        )}
                    </select>

                    <button
                        type="button"
                        onClick={
                            refreshData
                        }
                        disabled={
                            isLoadingData
                        }
                    >
                        <FaSyncAlt />
                        Actualizar
                    </button>
                </div>
            </header>

            {message && (
                <div className="sales-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="sales-feedback error">
                    {error}
                </div>
            )}

            <nav className="sales-tabs">
                <button
                    type="button"
                    className={
                        activeTab ===
                            "COBROS"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "COBROS"
                        )
                    }
                >
                    <FaMoneyBillWave />
                    Cobrar pedidos
                </button>

                <button
                    type="button"
                    className={
                        activeTab ===
                            "CAJA"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "CAJA"
                        )
                    }
                >
                    <FaCashRegister />
                    Caja
                </button>

                <button
                    type="button"
                    className={
                        activeTab ===
                            "VENTAS"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "VENTAS"
                        )
                    }
                >
                    <FaReceipt />
                    Historial de ventas
                </button>
                <button
                    type="button"
                    className={
                        activeTab ===
                            "GASTOS"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "GASTOS"
                        )
                    }
                >
                    <FaFileInvoiceDollar />
                    Gastos
                </button>
            </nav>

            {activeTab === "COBROS" && (
                <>
                    <div className="sales-stat-grid">
                        <article>
                            <FaReceipt />

                            <div>
                                <span>
                                    Pedidos por cobrar
                                </span>

                                <strong>
                                    {
                                        saleOptions
                                            .pedidos
                                            .length
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaCashRegister />

                            <div>
                                <span>
                                    Cajas abiertas
                                </span>

                                <strong>
                                    {
                                        saleOptions
                                            .cajas
                                            .length
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaWallet />

                            <div>
                                <span>
                                    Saldo del cobro
                                </span>

                                <strong>
                                    {formatMoney(
                                        amountToCharge
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaCoins />

                            <div>
                                <span>
                                    Adelanto aplicado
                                </span>

                                <strong>
                                    {formatMoney(
                                        appliedAdvance
                                    )}
                                </strong>
                            </div>
                        </article>
                    </div>

                    <section className="sales-section-card">
                        <div className="sales-section-heading">
                            <div>
                                <h3>
                                    Pedidos entregados
                                </h3>

                                <p>
                                    Selecciona el pedido
                                    que será cobrado.
                                </p>
                            </div>
                        </div>

                        {saleOptions.pedidos.length ===
                            0 ? (
                            <div className="sales-empty-state">
                                <FaCheck />

                                <strong>
                                    No hay pedidos
                                    pendientes de cobro
                                </strong>
                            </div>
                        ) : (
                            <div className="charge-order-grid">
                                {saleOptions.pedidos.map(
                                    (
                                        order
                                    ) => (
                                        <article
                                            key={
                                                order.id
                                            }
                                            className={
                                                selectedOrderId ===
                                                    order.id
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            <header>
                                                <div>
                                                    <span>
                                                        Pedido
                                                    </span>

                                                    <h3>
                                                        {
                                                            order.codigo
                                                        }
                                                    </h3>
                                                </div>

                                                <strong>
                                                    {formatMoney(
                                                        order.subtotal
                                                    )}
                                                </strong>
                                            </header>

                                            <dl>
                                                <div>
                                                    <dt>
                                                        Cliente
                                                    </dt>

                                                    <dd>
                                                        {order
                                                            .cliente
                                                            ?.nombreCompleto ??
                                                            "Público general"}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt>
                                                        Zona
                                                    </dt>

                                                    <dd>
                                                        {order
                                                            .zona
                                                            ?.nombre ??
                                                            "Para llevar"}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt>
                                                        Productos
                                                    </dt>

                                                    <dd>
                                                        {
                                                            order
                                                                .detalles
                                                                .length
                                                        }
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt>
                                                        Adelanto
                                                    </dt>

                                                    <dd>
                                                        {formatMoney(
                                                            order
                                                                .reserva
                                                                ?.adelantoPagado ??
                                                            0
                                                        )}
                                                    </dd>
                                                </div>
                                            </dl>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSelectOrder(
                                                        order.id
                                                    )
                                                }
                                            >
                                                <FaMoneyBillWave />
                                                Cobrar
                                            </button>
                                        </article>
                                    )
                                )}
                            </div>
                        )}
                    </section>

                    {selectedOrder && (
                        <form
                            className="charge-form-card"
                            onSubmit={
                                handleCreateSale
                            }
                        >
                            <div className="sales-section-heading">
                                <div>
                                    <span className="admin-eyebrow">
                                        NUEVO COBRO
                                    </span>

                                    <h3>
                                        Pedido{" "}
                                        {
                                            selectedOrder.codigo
                                        }
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    className="sales-close-button"
                                    onClick={
                                        closeChargeForm
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="charge-form-grid">
                                <label>
                                    Caja abierta *

                                    <select
                                        value={
                                            saleForm
                                                .cajaId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSaleForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    cajaId:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {saleOptions.cajas.map(
                                            (
                                                cash
                                            ) => (
                                                <option
                                                    key={
                                                        cash.id
                                                    }
                                                    value={
                                                        cash.id
                                                    }
                                                >
                                                    {
                                                        cash.codigo
                                                    }
                                                    {" — "}
                                                    {
                                                        cash
                                                            .vendedor
                                                            .nombreCompleto
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label>
                                    Nombre del cliente

                                    <input
                                        type="text"
                                        maxLength="200"
                                        value={
                                            saleForm
                                                .nombreCliente
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSaleForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    nombreCliente:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Descuento manual

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            saleForm
                                                .descuento
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSaleForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    descuento:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Propina

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            saleForm
                                                .propina
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSaleForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    propina:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <label className="charge-field-full">
                                    Observaciones

                                    <textarea
                                        rows="3"
                                        maxLength="2000"
                                        value={
                                            saleForm
                                                .observaciones
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSaleForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    observaciones:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            <section className="charge-promotions">
                                <div className="charge-promotions-heading">
                                    <div>
                                        <FaTag />

                                        <div>
                                            <strong>
                                                Promociones automáticas
                                            </strong>

                                            <span>
                                                Calculadas según el pedido, sucursal y vigencia.
                                            </span>
                                        </div>
                                    </div>

                                    <strong>
                                        -
                                        {formatMoney(
                                            automaticDiscount
                                        )}
                                    </strong>
                                </div>

                                {isLoadingPromotionPreview ? (
                                    <div className="charge-promotions-loading">
                                        <FaSyncAlt />
                                        Calculando promociones...
                                    </div>
                                ) : !promotionPreview ? (
                                    <div className="charge-promotions-warning">
                                        No se pudo validar el cálculo promocional.
                                    </div>
                                ) : promotionPreview
                                    .promociones
                                    .length === 0 ? (
                                    <div className="charge-promotions-empty">
                                        El pedido no tiene promociones aplicables.
                                    </div>
                                ) : (
                                    <div className="charge-promotions-list">
                                        {promotionPreview.promociones.map(
                                            (promotion) => (
                                                <article
                                                    key={
                                                        promotion.promocionId
                                                    }
                                                >
                                                    <div>
                                                        <strong>
                                                            {
                                                                promotion.nombre
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                promotion.descripcion
                                                            }
                                                        </span>
                                                    </div>

                                                    <strong>
                                                        -
                                                        {formatMoney(
                                                            promotion.montoDescuento
                                                        )}
                                                    </strong>
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="charge-rewards">
                                <div className="charge-rewards-heading">
                                    <div>
                                        <FaGift />

                                        <div>
                                            <strong>
                                                Premios de fidelización
                                            </strong>

                                            <span>
                                                Beneficios disponibles para el cliente del pedido.
                                            </span>
                                        </div>
                                    </div>

                                    <strong>
                                        -
                                        {formatMoney(
                                            rewardDiscount
                                        )}
                                    </strong>
                                </div>

                                {isLoadingRewards ? (
                                    <div className="charge-rewards-message">
                                        <FaSyncAlt />
                                        Cargando premios...
                                    </div>
                                ) : !loyaltyRedemptionOptions
                                    .cliente ? (
                                    <div className="charge-rewards-message">
                                        Este pedido no está asociado a un cliente registrado.
                                    </div>
                                ) : loyaltyRedemptionOptions
                                    .premios.length ===
                                    0 ? (
                                    <div className="charge-rewards-message">
                                        {
                                            loyaltyRedemptionOptions
                                                .cliente
                                                .nombreCompleto
                                        }{" "}
                                        no tiene premios disponibles.
                                    </div>
                                ) : (
                                    <>
                                        <div className="charge-rewards-customer">
                                            <span>
                                                Cliente
                                            </span>

                                            <strong>
                                                {
                                                    loyaltyRedemptionOptions
                                                        .cliente
                                                        .nombreCompleto
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    loyaltyRedemptionOptions
                                                        .premios
                                                        .length
                                                }{" "}
                                                premio(s) disponible(s)
                                            </span>
                                        </div>

                                        <div className="charge-rewards-list">
                                            {loyaltyRedemptionOptions
                                                .premios
                                                .map(
                                                    (
                                                        reward
                                                    ) => {
                                                        const isSelected =
                                                            selectedRewardIds.includes(
                                                                reward.id
                                                            );

                                                        return (
                                                            <label
                                                                key={
                                                                    reward.id
                                                                }
                                                                className={`charge-reward-option ${isSelected
                                                                    ? "selected"
                                                                    : ""
                                                                    } ${!reward.aplicable
                                                                        ? "disabled"
                                                                        : ""
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        isSelected
                                                                    }
                                                                    disabled={
                                                                        !reward.aplicable ||
                                                                        isLoadingRewardPreview
                                                                    }
                                                                    onChange={() =>
                                                                        toggleReward(
                                                                            reward.id
                                                                        )
                                                                    }
                                                                />

                                                                <div className="charge-reward-info">
                                                                    <div>
                                                                        <strong>
                                                                            {
                                                                                reward.descripcion
                                                                            }
                                                                        </strong>

                                                                        <span>
                                                                            {
                                                                                reward
                                                                                    .programa
                                                                                    .nombre
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    <div className="charge-reward-meta">
                                                                        <span>
                                                                            {formatLabel(
                                                                                reward.tipoRecompensa
                                                                            )}
                                                                        </span>

                                                                        <span>
                                                                            Vence{" "}
                                                                            {formatDate(
                                                                                reward.fechaVencimiento
                                                                            )}
                                                                        </span>
                                                                    </div>

                                                                    {!reward.aplicable && (
                                                                        <small>
                                                                            {
                                                                                reward.motivoNoAplicable
                                                                            }
                                                                        </small>
                                                                    )}
                                                                </div>

                                                                <strong className="charge-reward-value">
                                                                    {reward.tipoRecompensa ===
                                                                        "BENEFICIO"
                                                                        ? "Beneficio"
                                                                        : `-${formatMoney(
                                                                            reward.montoEstimado
                                                                        )}`}
                                                                </strong>
                                                            </label>
                                                        );
                                                    }
                                                )}
                                        </div>

                                        {selectedRewardIds.length >
                                            0 && (
                                                <div className="charge-rewards-selected">
                                                    <span>
                                                        {
                                                            selectedRewardIds
                                                                .length
                                                        }{" "}
                                                        premio(s) seleccionado(s)
                                                    </span>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            isLoadingRewardPreview
                                                        }
                                                        onClick={
                                                            clearSelectedRewards
                                                        }
                                                    >
                                                        Quitar todos
                                                    </button>
                                                </div>
                                            )}

                                        {isLoadingRewardPreview && (
                                            <div className="charge-rewards-message calculating">
                                                <FaSyncAlt />
                                                Recalculando premios...
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>

                            <div className="charge-summary">
                                <div>
                                    <span>
                                        Subtotal
                                    </span>

                                    <strong>
                                        {formatMoney(
                                            subtotal
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Promociones
                                    </span>

                                    <strong>
                                        -
                                        {formatMoney(
                                            automaticDiscount
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Premios
                                    </span>

                                    <strong>
                                        -
                                        {formatMoney(
                                            rewardDiscount
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Descuento manual
                                    </span>

                                    <strong>
                                        -
                                        {formatMoney(
                                            discount
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Descuento total
                                    </span>

                                    <strong>
                                        -
                                        {formatMoney(
                                            totalDiscount
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Propina
                                    </span>

                                    <strong>
                                        {formatMoney(
                                            tip
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Total
                                    </span>

                                    <strong>
                                        {formatMoney(
                                            saleTotal
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Adelanto
                                    </span>

                                    <strong>
                                        -
                                        {formatMoney(
                                            appliedAdvance
                                        )}
                                    </strong>
                                </div>

                                <div className="primary">
                                    <span>
                                        Saldo a cobrar
                                    </span>

                                    <strong>
                                        {formatMoney(
                                            amountToCharge
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <div className="payment-heading">
                                <div>
                                    <h4>
                                        Métodos de pago
                                    </h4>

                                    <p>
                                        Pagado:{" "}
                                        {formatMoney(
                                            paymentsTotal
                                        )}
                                        {" · "}
                                        Pendiente:{" "}
                                        {formatMoney(
                                            pendingAmount
                                        )}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        addPayment
                                    }
                                >
                                    <FaPlus />
                                    Agregar pago
                                </button>
                            </div>

                            <div className="payment-list">
                                {saleForm.pagos.map(
                                    (
                                        payment
                                    ) => {
                                        const paymentAmount =
                                            numberValue(
                                                payment
                                                    .monto
                                            );

                                        const received =
                                            numberValue(
                                                payment
                                                    .montoRecibido
                                            );

                                        const change =
                                            payment
                                                .metodoPago ===
                                                "EFECTIVO"
                                                ? Math.max(
                                                    0,
                                                    received -
                                                    paymentAmount
                                                )
                                                : 0;

                                        return (
                                            <article
                                                key={
                                                    payment.id
                                                }
                                            >
                                                <select
                                                    value={
                                                        payment
                                                            .metodoPago
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updatePayment(
                                                            payment.id,
                                                            "metodoPago",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                >
                                                    {saleOptions.metodosPago.map(
                                                        (
                                                            method
                                                        ) => (
                                                            <option
                                                                key={
                                                                    method.codigo
                                                                }
                                                                value={
                                                                    method.codigo
                                                                }
                                                            >
                                                                {
                                                                    method.nombre
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>

                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    placeholder="Monto"
                                                    value={
                                                        payment
                                                            .monto
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updatePayment(
                                                            payment.id,
                                                            "monto",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />

                                                {payment.metodoPago ===
                                                    "EFECTIVO" ? (
                                                    <div className="cash-payment-fields">
                                                        <input
                                                            type="number"
                                                            min={
                                                                paymentAmount
                                                            }
                                                            step="0.01"
                                                            placeholder="Recibido"
                                                            value={
                                                                payment
                                                                    .montoRecibido
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updatePayment(
                                                                    payment.id,
                                                                    "montoRecibido",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />

                                                        <small>
                                                            Vuelto:{" "}
                                                            {formatMoney(
                                                                change
                                                            )}
                                                        </small>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        maxLength="100"
                                                        placeholder="N.º de operación"
                                                        value={
                                                            payment
                                                                .numeroOperacion
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updatePayment(
                                                                payment.id,
                                                                "numeroOperacion",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                )}

                                                <button
                                                    type="button"
                                                    className="remove-payment"
                                                    onClick={() =>
                                                        removePayment(
                                                            payment.id
                                                        )
                                                    }
                                                >
                                                    <FaTimes />
                                                </button>
                                            </article>
                                        );
                                    }
                                )}
                            </div>

                            <div className="sales-form-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={
                                        closeChargeForm
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="primary"
                                    disabled={
                                        isSaving ||
                                        isLoadingPromotionPreview ||
                                        isLoadingRewards ||
                                        isLoadingRewardPreview ||
                                        !promotionPreview ||
                                        (
                                            selectedRewardIds
                                                .length > 0 &&
                                            !loyaltyRedemptionPreview
                                        ) ||
                                        saleOptions
                                            .cajas
                                            .length === 0
                                    }
                                >
                                    <FaSave />

                                    {isSaving
                                        ? "Registrando..."
                                        : isLoadingPromotionPreview
                                            ? "Calculando promociones..."
                                            : isLoadingRewards
                                                ? "Consultando premios..."
                                                : isLoadingRewardPreview
                                                    ? "Calculando premios..."
                                                    : "Registrar venta"}
                                </button>

                            </div>
                        </form>
                    )}
                </>
            )}

            {activeTab === "CAJA" && (
                <>
                    <section className="cash-current-card">
                        <div className="sales-section-heading">
                            <div>
                                <h3>
                                    Caja actual
                                </h3>

                                <p>
                                    Selecciona el usuario
                                    responsable.
                                </p>
                            </div>

                            <select
                                value={
                                    selectedSellerId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSelectedSellerId(
                                        event.target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {cashOptions.vendedores.map(
                                    (
                                        seller
                                    ) => (
                                        <option
                                            key={
                                                seller.id
                                            }
                                            value={
                                                seller.id
                                            }
                                        >
                                            {
                                                seller
                                                    .nombreCompleto
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {isLoadingCurrentCash ? (
                            <div className="sales-empty-state">
                                Consultando caja...
                            </div>
                        ) : currentCash ? (
                            <>
                                <div className="cash-summary-grid">
                                    <article>
                                        <span>
                                            Código
                                        </span>

                                        <strong>
                                            {
                                                currentCash.codigo
                                            }
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Monto inicial
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .montoInicial
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Total ventas
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .totalVentas
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Efectivo esperado
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .efectivoEsperado
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Yape
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .totalYape
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Plin
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .totalPlin
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Tarjeta
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .totalTarjeta
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>
                                            Transferencia
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                currentCash
                                                    .totalTransferencia
                                            )}
                                        </strong>
                                    </article>
                                </div>

                                <form
                                    className="cash-close-form"
                                    onSubmit={
                                        handleCloseCash
                                    }
                                >
                                    <label>
                                        Efectivo contado *

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                                closeCashForm
                                                    .efectivoContado
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setCloseCashForm(
                                                    (
                                                        previous
                                                    ) => ({
                                                        ...previous,

                                                        efectivoContado:
                                                            event
                                                                .target
                                                                .value
                                                    })
                                                )
                                            }
                                        />
                                    </label>

                                    <label>
                                        Diferencia estimada

                                        <div className="cash-readonly">
                                            {formatMoney(
                                                numberValue(
                                                    closeCashForm
                                                        .efectivoContado
                                                ) -
                                                currentCash
                                                    .efectivoEsperado
                                            )}
                                        </div>
                                    </label>

                                    <label className="cash-field-full">
                                        Observaciones del cierre

                                        <textarea
                                            rows="3"
                                            maxLength="2000"
                                            value={
                                                closeCashForm
                                                    .observaciones
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setCloseCashForm(
                                                    (
                                                        previous
                                                    ) => ({
                                                        ...previous,

                                                        observaciones:
                                                            event
                                                                .target
                                                                .value
                                                    })
                                                )
                                            }
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={
                                            isSaving
                                        }
                                    >
                                        <FaCashRegister />
                                        Cerrar caja
                                    </button>
                                </form>
                            </>
                        ) : (
                            <form
                                className="cash-open-form"
                                onSubmit={
                                    handleOpenCash
                                }
                            >
                                <div className="sales-empty-state compact">
                                    <FaCashRegister />

                                    <strong>
                                        El usuario no
                                        tiene una caja
                                        abierta
                                    </strong>
                                </div>

                                <label>
                                    Monto inicial *

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            openCashForm
                                                .montoInicial
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setOpenCashForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    montoInicial:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Observaciones

                                    <textarea
                                        rows="3"
                                        maxLength="2000"
                                        value={
                                            openCashForm
                                                .observaciones
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setOpenCashForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    observaciones:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={
                                        isSaving ||
                                        !selectedSellerId
                                    }
                                >
                                    <FaCashRegister />
                                    Abrir caja
                                </button>
                            </form>
                        )}
                    </section>

                    <section className="sales-section-card">
                        <div className="sales-section-heading">
                            <div>
                                <h3>
                                    Historial de cajas
                                </h3>

                                <p>
                                    {
                                        cashPagination.total
                                    }{" "}
                                    registro(s)
                                </p>
                            </div>

                            <select
                                value={
                                    cashState
                                }
                                onChange={(
                                    event
                                ) => {
                                    setCashState(
                                        event.target
                                            .value
                                    );

                                    setCashPage(1);
                                }}
                            >
                                <option value="TODOS">
                                    Todos los estados
                                </option>

                                <option value="ABIERTA">
                                    Abiertas
                                </option>

                                <option value="CERRADA">
                                    Cerradas
                                </option>

                                <option value="ANULADA">
                                    Anuladas
                                </option>
                            </select>
                        </div>

                        <div className="sales-table-wrapper">
                            <table className="sales-table">
                                <thead>
                                    <tr>
                                        <th>Caja</th>
                                        <th>Responsable</th>
                                        <th>Apertura</th>
                                        <th>Ventas</th>
                                        <th>Esperado</th>
                                        <th>Diferencia</th>
                                        <th>Estado</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {cashRegisters.map(
                                        (
                                            cash
                                        ) => (
                                            <tr
                                                key={
                                                    cash.id
                                                }
                                            >
                                                <td>
                                                    <strong>
                                                        {
                                                            cash.codigo
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        cash
                                                            .vendedor
                                                            .nombreCompleto
                                                    }
                                                </td>

                                                <td>
                                                    {formatDateTime(
                                                        cash
                                                            .fechaApertura
                                                    )}
                                                </td>

                                                <td>
                                                    {formatMoney(
                                                        cash
                                                            .totalVentas
                                                    )}
                                                </td>

                                                <td>
                                                    {formatMoney(
                                                        cash
                                                            .efectivoEsperado
                                                    )}
                                                </td>

                                                <td>
                                                    {cash.diferencia ===
                                                        null
                                                        ? "-"
                                                        : formatMoney(
                                                            cash.diferencia
                                                        )}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`sales-status ${cash.estado.toLowerCase()}`}
                                                    >
                                                        {formatLabel(
                                                            cash.estado
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        className="sales-icon-button"
                                                        disabled={
                                                            isLoadingDetail
                                                        }
                                                        onClick={() =>
                                                            openCashDetail(
                                                                cash.id
                                                            )
                                                        }
                                                    >
                                                        <FaEye />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="sales-pagination">
                            <span>
                                Página{" "}
                                {
                                    cashPagination.page
                                }{" "}
                                de{" "}
                                {
                                    cashPagination.totalPages
                                }
                            </span>

                            <div>
                                <button
                                    type="button"
                                    disabled={
                                        cashPage <= 1
                                    }
                                    onClick={() =>
                                        setCashPage(
                                            (
                                                value
                                            ) =>
                                                Math.max(
                                                    1,
                                                    value -
                                                    1
                                                )
                                        )
                                    }
                                >
                                    <FaChevronLeft />
                                    Anterior
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        cashPage >=
                                        cashPagination
                                            .totalPages
                                    }
                                    onClick={() =>
                                        setCashPage(
                                            (
                                                value
                                            ) =>
                                                value +
                                                1
                                        )
                                    }
                                >
                                    Siguiente
                                    <FaChevronRight />
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {activeTab === "VENTAS" && (
                <section className="sales-section-card">
                    <div className="sales-section-heading">
                        <div>
                            <h3>
                                Ventas registradas
                            </h3>

                            <p>
                                {
                                    salePagination.total
                                }{" "}
                                venta(s)
                            </p>
                        </div>
                    </div>

                    <form
                        className="sales-filters"
                        onSubmit={
                            handleSaleSearch
                        }
                    >
                        <div className="sales-search">
                            <FaSearch />

                            <input
                                type="search"
                                placeholder="Ticket, pedido o cliente..."
                                value={
                                    saleSearch
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSaleSearch(
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <select
                            value={
                                saleState
                            }
                            onChange={(
                                event
                            ) => {
                                setSaleState(
                                    event.target
                                        .value
                                );

                                setSalePage(1);
                            }}
                        >
                            <option value="TODOS">
                                Todos los estados
                            </option>

                            <option value="CONFIRMADA">
                                Confirmadas
                            </option>

                            <option value="ANULADA">
                                Anuladas
                            </option>
                        </select>

                        <button type="submit">
                            Buscar
                        </button>
                    </form>

                    <div className="sales-table-wrapper">
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Pedido</th>
                                    <th>Cliente</th>
                                    <th>Caja</th>
                                    <th>Pago</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {sales.map(
                                    (sale) => (
                                        <tr
                                            key={
                                                sale.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        sale.numeroTicket
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    sale
                                                        .pedido
                                                        .codigo
                                                }
                                            </td>

                                            <td>
                                                {sale.nombreCliente ??
                                                    sale
                                                        .cliente
                                                        ?.nombreCompleto ??
                                                    "Público general"}
                                            </td>

                                            <td>
                                                {
                                                    sale.caja
                                                        .codigo
                                                }
                                            </td>

                                            <td>
                                                {sale.metodosPago
                                                    .map(
                                                        formatLabel
                                                    )
                                                    .join(
                                                        ", "
                                                    ) ||
                                                    "Adelanto"}
                                            </td>

                                            <td>
                                                {formatMoney(
                                                    sale.total
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`sales-status ${sale.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        sale.estado
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    sale.createdAt
                                                )}
                                            </td>

                                            <td>
                                                <div className="sales-row-actions">
                                                    <button
                                                        type="button"
                                                        className="sales-icon-button"
                                                        disabled={isLoadingDetail}
                                                        title="Ver detalle"
                                                        onClick={() =>
                                                            openSaleDetail(
                                                                sale.id
                                                            )
                                                        }
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="sales-icon-button"
                                                        title="Imprimir ticket"
                                                        onClick={() =>
                                                            navigate(
                                                                `/admin/ventas/ticket/${sale.id}`
                                                            )
                                                        }
                                                    >
                                                        <FaPrint />
                                                    </button>

                                                    {sale.estado ===
                                                        "CONFIRMADA" && (
                                                            <button
                                                                type="button"
                                                                className="sales-icon-button"
                                                                title="Anular venta"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/admin/ventas/anular/${sale.id}`
                                                                    )
                                                                }
                                                            >
                                                                <FaBan />
                                                            </button>
                                                        )}

                                                </div>
                                            </td>

                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="sales-pagination">
                        <span>
                            Página{" "}
                            {salePagination.page}{" "}
                            de{" "}
                            {
                                salePagination.totalPages
                            }
                        </span>

                        <div>
                            <button
                                type="button"
                                disabled={
                                    salePage <= 1
                                }
                                onClick={() =>
                                    setSalePage(
                                        (
                                            value
                                        ) =>
                                            Math.max(
                                                1,
                                                value -
                                                1
                                            )
                                    )
                                }
                            >
                                <FaChevronLeft />
                                Anterior
                            </button>

                            <button
                                type="button"
                                disabled={
                                    salePage >=
                                    salePagination
                                        .totalPages
                                }
                                onClick={() =>
                                    setSalePage(
                                        (
                                            value
                                        ) =>
                                            value + 1
                                    )
                                }
                            >
                                Siguiente
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === "GASTOS" && (
                <>
                    <div className="expense-stat-grid">
                        <article>
                            <FaFileInvoiceDollar />

                            <div>
                                <span>
                                    Gastos mostrados
                                </span>

                                <strong>
                                    {
                                        expensePagination.total
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaCoins />

                            <div>
                                <span>
                                    Total registrado
                                </span>

                                <strong>
                                    {formatMoney(
                                        registeredExpenseTotal
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaCashRegister />

                            <div>
                                <span>
                                    Salió de caja
                                </span>

                                <strong>
                                    {formatMoney(
                                        cashExpenseTotal
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaWallet />

                            <div>
                                <span>
                                    Cajas disponibles
                                </span>

                                <strong>
                                    {
                                        expenseOptions
                                            .cajas
                                            .length
                                    }
                                </strong>
                            </div>
                        </article>
                    </div>

                    <section className="expense-form-card">
                        <div className="sales-section-heading">
                            <div>
                                <span className="admin-eyebrow">
                                    NUEVO GASTO
                                </span>

                                <h3>
                                    Registrar gasto
                                </h3>

                                <p>
                                    Registra compras, servicios,
                                    pérdidas y otros egresos.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="expense-category-button"
                                onClick={() =>
                                    setShowCategoryForm(
                                        (value) =>
                                            !value
                                    )
                                }
                            >
                                <FaTag />
                                Nueva categoría
                            </button>
                        </div>

                        {showCategoryForm && (
                            <form
                                className="expense-category-form"
                                onSubmit={
                                    handleCreateExpenseCategory
                                }
                            >
                                <label>
                                    Nombre *

                                    <input
                                        type="text"
                                        maxLength="100"
                                        value={
                                            categoryForm.nombre
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCategoryForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    nombre:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Descripción

                                    <input
                                        type="text"
                                        maxLength="1000"
                                        value={
                                            categoryForm
                                                .descripcion
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCategoryForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    descripcion:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaSave />
                                    Crear categoría
                                </button>
                            </form>
                        )}

                        <form
                            className="expense-form-grid"
                            onSubmit={
                                handleCreateExpense
                            }
                        >
                            <label>
                                Categoría *

                                <select
                                    value={
                                        expenseForm
                                            .categoriaGastoId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "categoriaGastoId",
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {expenseOptions.categorias.map(
                                        (
                                            category
                                        ) => (
                                            <option
                                                key={
                                                    category.id
                                                }
                                                value={
                                                    category.id
                                                }
                                            >
                                                {
                                                    category.nombre
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label>
                                Monto *

                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                        expenseForm.monto
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "monto",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Método de pago *

                                <select
                                    value={
                                        expenseForm
                                            .metodoPago
                                    }
                                    disabled={
                                        expenseForm
                                            .salioDeCaja
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "metodoPago",
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    {expenseOptions.metodosPago.map(
                                        (
                                            method
                                        ) => (
                                            <option
                                                key={
                                                    method.codigo
                                                }
                                                value={
                                                    method.codigo
                                                }
                                            >
                                                {
                                                    method.nombre
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label>
                                Fecha del gasto

                                <input
                                    type="date"
                                    value={
                                        expenseForm
                                            .fechaGasto
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "fechaGasto",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className="expense-field-full">
                                Descripción *

                                <textarea
                                    rows="3"
                                    maxLength="2000"
                                    value={
                                        expenseForm
                                            .descripcion
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "descripcion",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className="expense-checkbox-field">
                                <input
                                    type="checkbox"
                                    checked={
                                        expenseForm
                                            .salioDeCaja
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "salioDeCaja",
                                            event.target
                                                .checked
                                        )
                                    }
                                />

                                El dinero salió de una caja abierta
                            </label>

                            {expenseForm.salioDeCaja && (
                                <label>
                                    Caja de origen *

                                    <select
                                        value={
                                            expenseForm
                                                .cajaId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleExpenseFieldChange(
                                                "cajaId",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {expenseOptions.cajas.map(
                                            (
                                                cash
                                            ) => (
                                                <option
                                                    key={
                                                        cash.id
                                                    }
                                                    value={
                                                        cash.id
                                                    }
                                                >
                                                    {
                                                        cash.codigo
                                                    }
                                                    {" — "}
                                                    {
                                                        cash
                                                            .vendedor
                                                            .nombreCompleto
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>
                            )}

                            <label className="expense-field-full">
                                URL del comprobante

                                <input
                                    type="text"
                                    maxLength="500"
                                    placeholder="Enlace opcional de foto o comprobante"
                                    value={
                                        expenseForm
                                            .comprobanteUrl
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleExpenseFieldChange(
                                            "comprobanteUrl",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <div className="expense-form-actions expense-field-full">
                                <button
                                    type="submit"
                                    disabled={
                                        isSaving ||
                                        expenseOptions
                                            .categorias
                                            .length ===
                                        0
                                    }
                                >
                                    <FaSave />

                                    {isSaving
                                        ? "Registrando..."
                                        : "Registrar gasto"}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="sales-section-card">
                        <div className="sales-section-heading">
                            <div>
                                <h3>
                                    Historial de gastos
                                </h3>

                                <p>
                                    {
                                        expensePagination.total
                                    }{" "}
                                    registro(s)
                                </p>
                            </div>
                        </div>

                        <form
                            className="expense-filters"
                            onSubmit={
                                handleExpenseSearch
                            }
                        >
                            <div className="expense-search">
                                <FaSearch />

                                <input
                                    type="search"
                                    placeholder="Descripción, categoría o responsable..."
                                    value={
                                        expenseSearch
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setExpenseSearch(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </div>

                            <select
                                value={
                                    expenseFilters
                                        .categoriaGastoId
                                }
                                onChange={(
                                    event
                                ) => {
                                    setExpenseFilters(
                                        (
                                            previous
                                        ) => ({
                                            ...previous,

                                            categoriaGastoId:
                                                event.target
                                                    .value
                                        })
                                    );

                                    setExpensePage(1);
                                }}
                            >
                                <option value="">
                                    Todas las categorías
                                </option>

                                {expenseOptions.categorias.map(
                                    (category) => (
                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {
                                                category.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <select
                                value={
                                    expenseFilters.estado
                                }
                                onChange={(
                                    event
                                ) => {
                                    setExpenseFilters(
                                        (
                                            previous
                                        ) => ({
                                            ...previous,

                                            estado:
                                                event.target
                                                    .value
                                        })
                                    );

                                    setExpensePage(1);
                                }}
                            >
                                <option value="TODOS">
                                    Todos los estados
                                </option>

                                <option value="REGISTRADO">
                                    Registrados
                                </option>

                                <option value="ANULADO">
                                    Anulados
                                </option>
                            </select>

                            <select
                                value={
                                    expenseFilters
                                        .salioDeCaja
                                }
                                onChange={(
                                    event
                                ) => {
                                    setExpenseFilters(
                                        (
                                            previous
                                        ) => ({
                                            ...previous,

                                            salioDeCaja:
                                                event.target
                                                    .value
                                        })
                                    );

                                    setExpensePage(1);
                                }}
                            >
                                <option value="TODOS">
                                    Cualquier origen
                                </option>

                                <option value="SI">
                                    Salió de caja
                                </option>

                                <option value="NO">
                                    No salió de caja
                                </option>
                            </select>

                            <select
                                value={
                                    expenseFilters
                                        .metodoPago
                                }
                                onChange={(
                                    event
                                ) => {
                                    setExpenseFilters(
                                        (
                                            previous
                                        ) => ({
                                            ...previous,

                                            metodoPago:
                                                event.target
                                                    .value
                                        })
                                    );

                                    setExpensePage(1);
                                }}
                            >
                                <option value="">
                                    Todos los métodos
                                </option>

                                {expenseOptions.metodosPago.map(
                                    (method) => (
                                        <option
                                            key={
                                                method.codigo
                                            }
                                            value={
                                                method.codigo
                                            }
                                        >
                                            {
                                                method.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <button type="submit">
                                Buscar
                            </button>
                        </form>

                        {expenses.length === 0 ? (
                            <div className="sales-empty-state">
                                <FaFileInvoiceDollar />

                                <strong>
                                    No hay gastos con los filtros seleccionados
                                </strong>
                            </div>
                        ) : (
                            <div className="sales-table-wrapper">
                                <table className="sales-table expense-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Categoría</th>
                                            <th>Descripción</th>
                                            <th>Método</th>
                                            <th>Caja</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                            <th></th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {expenses.map(
                                            (
                                                expense
                                            ) => (
                                                <tr
                                                    key={
                                                        expense.id
                                                    }
                                                >
                                                    <td>
                                                        {formatDateTime(
                                                            expense
                                                                .fechaGasto
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            expense
                                                                .categoriaGasto
                                                                .nombre
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            expense.descripcion
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatLabel(
                                                            expense
                                                                .metodoPago
                                                        )}
                                                    </td>

                                                    <td>
                                                        {expense.caja
                                                            ?.codigo ??
                                                            "-"}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {formatMoney(
                                                                expense.monto
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`sales-status ${expense.estado.toLowerCase()}`}
                                                        >
                                                            {formatLabel(
                                                                expense.estado
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="sales-icon-button"
                                                            disabled={
                                                                isLoadingDetail
                                                            }
                                                            onClick={() =>
                                                                openExpenseDetail(
                                                                    expense.id
                                                                )
                                                            }
                                                        >
                                                            <FaEye />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="sales-pagination">
                            <span>
                                Página{" "}
                                {
                                    expensePagination.page
                                }{" "}
                                de{" "}
                                {
                                    expensePagination.totalPages
                                }
                            </span>

                            <div>
                                <button
                                    type="button"
                                    disabled={
                                        expensePage <= 1
                                    }
                                    onClick={() =>
                                        setExpensePage(
                                            (value) =>
                                                Math.max(
                                                    1,
                                                    value - 1
                                                )
                                        )
                                    }
                                >
                                    <FaChevronLeft />
                                    Anterior
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        expensePage >=
                                        expensePagination
                                            .totalPages
                                    }
                                    onClick={() =>
                                        setExpensePage(
                                            (value) =>
                                                value + 1
                                        )
                                    }
                                >
                                    Siguiente
                                    <FaChevronRight />
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {selectedSale && (
                <article className="sale-detail-card">
                    <div className="sales-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                COMPROBANTE
                            </span>

                            <h3>
                                Ticket{" "}
                                {
                                    selectedSale.numeroTicket
                                }
                            </h3>

                            <p>
                                Pedido{" "}
                                {
                                    selectedSale
                                        .pedido
                                        .codigo
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            className="sales-close-button"
                            onClick={() =>
                                setSelectedSale(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="sale-detail-summary">
                        <article>
                            <span>
                                Cliente
                            </span>

                            <strong>
                                {selectedSale.nombreCliente ??
                                    selectedSale
                                        .cliente
                                        ?.nombreCompleto ??
                                    "Público general"}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Subtotal
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedSale.subtotal
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Promociones
                            </span>

                            <strong className="sale-discount-value">
                                -
                                {formatMoney(
                                    selectedSalePromotionalDiscount
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Premios
                            </span>

                            <strong className="sale-discount-value">
                                -
                                {formatMoney(
                                    selectedSaleRewardDiscount
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Descuento manual
                            </span>

                            <strong className="sale-discount-value">
                                -
                                {formatMoney(
                                    selectedSaleManualDiscount
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Descuento total
                            </span>

                            <strong className="sale-discount-value">
                                -
                                {formatMoney(
                                    selectedSale.descuento
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Total
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedSale.total
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Adelanto
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedSale
                                        .adelantoAplicado
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Fecha
                            </span>

                            <strong>
                                {formatDateTime(
                                    selectedSale.createdAt
                                )}
                            </strong>
                        </article>
                    </div>

                    <div className="sale-detail-columns">
                        <section>
                            <h4>
                                Productos
                            </h4>

                            {selectedSale.detalles.map(
                                (
                                    detail
                                ) => (
                                    <article
                                        className="sale-product-row"
                                        key={
                                            detail.id
                                        }
                                    >
                                        <div>
                                            <strong>
                                                {
                                                    detail.nombreProducto
                                                }
                                            </strong>

                                            <small>
                                                {
                                                    detail.cantidad
                                                }
                                                {" × "}
                                                {formatMoney(
                                                    detail
                                                        .precioUnitario
                                                )}
                                            </small>
                                        </div>

                                        <span>
                                            {formatMoney(
                                                detail.subtotal
                                            )}
                                        </span>
                                    </article>
                                )
                            )}
                        </section>

                        <section>
                            <h4>
                                Pagos
                            </h4>

                            {selectedSale.pagos.length ===
                                0 ? (
                                <p className="sale-no-payments">
                                    Venta cubierta
                                    completamente con el
                                    adelanto.
                                </p>
                            ) : (
                                selectedSale.pagos.map(
                                    (
                                        payment
                                    ) => (
                                        <article
                                            className="sale-payment-row"
                                            key={
                                                payment.id
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {formatLabel(
                                                        payment
                                                            .metodoPago
                                                    )}
                                                </strong>

                                                <small>
                                                    {payment.numeroOperacion ??
                                                        "Sin operación"}
                                                </small>
                                            </div>

                                            <span>
                                                {formatMoney(
                                                    payment.monto
                                                )}
                                            </span>
                                        </article>
                                    )
                                )
                            )}
                        </section>
                    </div>

                    <section className="sale-applied-promotions">
                        <div className="sale-applied-promotions-heading">
                            <div>
                                <FaTag />

                                <div>
                                    <h4>
                                        Promociones aplicadas
                                    </h4>

                                    <p>
                                        Beneficios registrados al momento del cobro.
                                    </p>
                                </div>
                            </div>

                            <strong>
                                -
                                {formatMoney(
                                    selectedSalePromotionalDiscount
                                )}
                            </strong>
                        </div>

                        {(
                            selectedSale
                                .promocionesAplicadas ??
                            []
                        ).length === 0 ? (
                            <p className="sale-no-promotions">
                                Esta venta no utilizó promociones.
                            </p>
                        ) : (
                            <div className="sale-applied-promotions-list">
                                {selectedSale
                                    .promocionesAplicadas
                                    .map(
                                        (
                                            appliedPromotion
                                        ) => (
                                            <article
                                                key={
                                                    appliedPromotion.id
                                                }
                                            >
                                                <div>
                                                    <strong>
                                                        {
                                                            appliedPromotion
                                                                .promocion
                                                                .nombre
                                                        }
                                                    </strong>

                                                    <span>
                                                        {formatLabel(
                                                            appliedPromotion
                                                                .promocion
                                                                .tipo
                                                        )}
                                                    </span>

                                                    <small>
                                                        {
                                                            appliedPromotion
                                                                .descripcion
                                                        }
                                                    </small>
                                                </div>

                                                <strong>
                                                    -
                                                    {formatMoney(
                                                        appliedPromotion
                                                            .montoDescuento
                                                    )}
                                                </strong>
                                            </article>
                                        )
                                    )}
                            </div>
                        )}
                    </section>

                    <section className="sale-redeemed-rewards">
                        <div className="sale-redeemed-rewards-heading">
                            <div>
                                <FaGift />

                                <div>
                                    <h4>
                                        Premios canjeados
                                    </h4>

                                    <p>
                                        Beneficios de fidelización utilizados en esta venta.
                                    </p>
                                </div>
                            </div>

                            <strong>
                                -
                                {formatMoney(
                                    selectedSaleRewardDiscount
                                )}
                            </strong>
                        </div>

                        {(
                            selectedSale
                                .canjesPremios ??
                            []
                        ).length === 0 ? (
                            <p className="sale-no-rewards">
                                Esta venta no utilizó premios de fidelización.
                            </p>
                        ) : (
                            <div className="sale-redeemed-rewards-list">
                                {selectedSale
                                    .canjesPremios
                                    .map(
                                        (
                                            redemption
                                        ) => (
                                            <article
                                                key={
                                                    redemption.id
                                                }
                                            >
                                                <div>
                                                    <strong>
                                                        {
                                                            redemption.descripcion
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            redemption
                                                                .premio
                                                                .programa
                                                                .nombre
                                                        }
                                                    </span>

                                                    <small>
                                                        {formatLabel(
                                                            redemption.tipoRecompensa
                                                        )}

                                                        {redemption
                                                            .productoPremioNombre
                                                            ? ` · ${redemption.productoPremioNombre}`
                                                            : ""}
                                                    </small>

                                                    {redemption.estado ===
                                                        "REVERTIDO" && (
                                                            <small className="sale-reward-reverted">
                                                                Canje revertido por anulación de venta
                                                            </small>
                                                        )}
                                                </div>

                                                <strong>
                                                    {numberValue(
                                                        redemption
                                                            .montoAplicado
                                                    ) > 0
                                                        ? `-${formatMoney(
                                                            redemption
                                                                .montoAplicado
                                                        )}`
                                                        : "Beneficio"}
                                                </strong>
                                            </article>
                                        )
                                    )}
                            </div>
                        )}
                    </section>

                </article>
            )}

            {selectedExpense && (
                <article className="expense-detail-card">
                    <div className="sales-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE DEL GASTO
                            </span>

                            <h3>
                                {
                                    selectedExpense
                                        .categoriaGasto
                                        .nombre
                                }
                            </h3>

                            <p>
                                Registrado por{" "}
                                {
                                    selectedExpense
                                        .administrador
                                        .nombreCompleto
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            className="sales-close-button"
                            onClick={() =>
                                setSelectedExpense(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="expense-detail-summary">
                        <article>
                            <span>
                                Monto
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedExpense.monto
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Método
                            </span>

                            <strong>
                                {formatLabel(
                                    selectedExpense
                                        .metodoPago
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Caja
                            </span>

                            <strong>
                                {selectedExpense.caja
                                    ?.codigo ??
                                    "No salió de caja"}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Estado
                            </span>

                            <strong>
                                {formatLabel(
                                    selectedExpense
                                        .estado
                                )}
                            </strong>
                        </article>
                    </div>

                    <dl className="expense-data-list">
                        <div>
                            <dt>
                                Sucursal
                            </dt>

                            <dd>
                                {
                                    selectedExpense
                                        .sucursal
                                        .nombre
                                }
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Fecha del gasto
                            </dt>

                            <dd>
                                {formatDateTime(
                                    selectedExpense
                                        .fechaGasto
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Descripción
                            </dt>

                            <dd>
                                {
                                    selectedExpense
                                        .descripcion
                                }
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Salió de caja
                            </dt>

                            <dd>
                                {selectedExpense
                                    .salioDeCaja
                                    ? "Sí"
                                    : "No"}
                            </dd>
                        </div>

                        {selectedExpense
                            .motivoAnulacion && (
                                <div>
                                    <dt>
                                        Motivo de anulación
                                    </dt>

                                    <dd>
                                        {
                                            selectedExpense
                                                .motivoAnulacion
                                        }
                                    </dd>
                                </div>
                            )}
                    </dl>

                    {selectedExpense.estado ===
                        "REGISTRADO" && (
                            <div className="expense-detail-actions">
                                <button
                                    type="button"
                                    disabled={
                                        isSaving
                                    }
                                    onClick={
                                        handleVoidExpense
                                    }
                                >
                                    <FaBan />
                                    Anular gasto
                                </button>
                            </div>
                        )}
                </article>
            )}

            {selectedCashDetail && (
                <article className="cash-detail-card">
                    <div className="sales-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE DE CAJA
                            </span>

                            <h3>
                                {
                                    selectedCashDetail.codigo
                                }
                            </h3>

                            <p>
                                {
                                    selectedCashDetail
                                        .vendedor
                                        .nombreCompleto
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            className="sales-close-button"
                            onClick={() =>
                                setSelectedCashDetail(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="cash-summary-grid">
                        <article>
                            <span>
                                Monto inicial
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedCashDetail
                                        .montoInicial
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Total ventas
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedCashDetail
                                        .totalVentas
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Efectivo esperado
                            </span>

                            <strong>
                                {formatMoney(
                                    selectedCashDetail
                                        .efectivoEsperado
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Efectivo contado
                            </span>

                            <strong>
                                {selectedCashDetail
                                    .efectivoContado ===
                                    null
                                    ? "-"
                                    : formatMoney(
                                        selectedCashDetail
                                            .efectivoContado
                                    )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Diferencia
                            </span>

                            <strong>
                                {selectedCashDetail
                                    .diferencia ===
                                    null
                                    ? "-"
                                    : formatMoney(
                                        selectedCashDetail
                                            .diferencia
                                    )}
                            </strong>
                        </article>

                        <article>
                            <span>
                                Estado
                            </span>

                            <strong>
                                {formatLabel(
                                    selectedCashDetail
                                        .estado
                                )}
                            </strong>
                        </article>
                    </div>
                </article>
            )}
        </section>
    );
}
export default SalesCashAdmin;