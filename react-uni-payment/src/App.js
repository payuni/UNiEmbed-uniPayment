import React, { useState, useEffect, useRef } from "react";

const UniPayment = () => {
  // 設定 token
  const setToken = "TOKENTOKEN放置此處";

  // 狀態管理
  const [useInst, setUseInst] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditInstOptions, setCreditInstOptions] = useState({});
  const [creditResList, setCreditResList] = useState({});
  const [selectedInst, setSelectedInst] = useState("");
  const [useCreditRed, setUseCreditRed] = useState(false);
  const hasInstChanged = useRef(false);

  // SDK 實例參考
  const payuniInstanceRef = useRef(null);

  // 計算屬性 - 是否沒有分期選項
  const emptyInstOption = Object.keys(creditInstOptions).length < 1;

  // 獲取初始化選項
  const getInitOption = () => {
    return {
      env: "S",
      useInst: useInst,
      elements: {
        CardNo: "put_card_no",
        CardExp: "put_card_exp",
        CardCvc: "put_card_cvc",
        CardTokenType: "put_token_type",
      },
      style: {
        color: "#000",
        fontSize: "14px",
        fontWeight: "400",
        lineHeight: "24px",
      },
    };
  };

  // 清理 SDK
  const clearPayuniSdk = () => {
    if (payuniInstanceRef.current) {
      document.querySelectorAll(".ifr_input").forEach((container) => {
        container.innerHTML = "";
      });
      payuniInstanceRef.current = null;
      setCanSubmit(false);
    }
  };

  // 初始化支付 SDK
  const initPayment = async () => {
    if (!window.UniPayment) {
      console.error("SDK 未載入");
      return;
    }

    const initOption = getInitOption();
    payuniInstanceRef.current = window.UniPayment.createSession(
      setToken,
      initOption
    );

    payuniInstanceRef.current.onUpdate(function (update) {
      if (update.status) {
        console.log(`
          Input 狀態：
          cardNumberStatus: ${update.status.CardNo}
          cardExpiryStatus: ${update.status.CardExp}
          ccvStatus: ${update.status.CardCvc}
        `);

        const allValid = Object.values(update.status).every(
          (value) => value === true
        );
        setCanSubmit(allValid);
      }
    });

    try {
      const resp = await payuniInstanceRef.current.start();
      console.log("回傳狀態:", resp);
      if (useInst && emptyInstOption) {
        fetchCardAcceptInfo();
      }
    } catch (error) {
      console.error("啟動 SDK 失敗:", error);
    }
  };

  // 取得分期紅利資訊
  const fetchCardAcceptInfo = async () => {
    if (!payuniInstanceRef.current) return;

    try {
      const resp = await payuniInstanceRef.current.getCardAcceptInfo();
      setCreditInstOptions(resp.CreditInst || {});
      setCreditResList(resp.CreditRed || {});
    } catch (e) {
      console.error("取得分期資訊失敗:", e);
    }
  };

  // 送出交易
  const buttonSubmit = async () => {
    if (!payuniInstanceRef.current || !canSubmit) return;

    setIsSubmitting(true);

    try {
      const resp = await payuniInstanceRef.current.getTradeResult({
        useRed: useCreditRed,
        cardInst: selectedInst,
      });

      console.log(`回傳結果: ${JSON.stringify(resp)}`);
    } catch (e) {
      console.error("付款失敗:", e);
    } finally {
      setIsSubmitting(false);
    }
  };
  // 監聽 useInst
  useEffect(() => {
    if (hasInstChanged.current) {
      clearPayuniSdk();
      initPayment();
    } else {
      hasInstChanged.current = true;
    }
  }, [useInst]);

  useEffect(() => {
    initPayment();

    // 組件卸載時清理
    return () => {
      clearPayuniSdk();
    };
  }, []); // 空依賴數組意味著這個效果只在掛載和卸載時執行

  return (
    <div className="m-3">
      <div className="mb-3">
        <input
          type="checkbox"
          className="form-check-input mb-3"
          id="useInstCheck"
          checked={useInst}
          onChange={(e) => setUseInst(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="useInstCheck">
          啟用分期/紅利功能
        </label>

        {useInst && (
          <div className="inst-red-area mb-3">
            <select
              className="form-select"
              id="card_inst"
              disabled={emptyInstOption}
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
            >
              <option value="">選擇期數</option>
              {Object.keys(creditInstOptions).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>

            <div className="mt-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="useRedCheck"
                checked={useCreditRed}
                onChange={(e) => setUseCreditRed(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="useRedCheck">
                紅利折抵
              </label>
              <a href="#" style={{ fontSize: "12px" }} title={creditResList}>
                (查看可紅利折抵銀行)
              </a>
            </div>
          </div>
        )}
      </div>

      <hr />

      <div className="payment-form">
        <div className="mb-3">
          <label className="mb-1">信用卡號碼</label>
          <div className="ifr_input" id="put_card_no"></div>
        </div>
        <div className="mb-3">
          <label className="mb-1">有效期限</label>
          <div className="ifr_input" id="put_card_exp"></div>
        </div>
        <div className="mb-3">
          <label className="mb-1">安全碼</label>
          <div className="ifr_input" id="put_card_cvc"></div>
        </div>
      </div>

      <button
        id="payButton"
        className={`w-100 btn mt-3 ${
          canSubmit ? "btn-primary" : "btn-secondary"
        }`}
        onClick={buttonSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? "處理中..." : "付款"}
      </button>
    </div>
  );
};

export default UniPayment;
