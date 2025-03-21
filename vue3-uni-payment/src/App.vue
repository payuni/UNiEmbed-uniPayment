<script setup>
import { ref, onMounted, computed, watch } from "vue";

const setToken = ref("TOKEN放置此處");
const useInst = ref(false);
const getInitOption = () => {
  return {
    env: "P",
    useInst: useInst.value, // 使用 useInst 的當前值
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
// payuni sdk instance
let payuniInstance = null;
// UI
const canSubmit = ref(false);
const isSubmitting = ref(false);
const creditInstOptions = ref({});
const creditResList = ref({});
// 表單
const selectedInst = ref("");
const useCreditRed = ref(false);
//computed
const emptyInstOption = computed(() => {
  return Object.keys(creditInstOptions.value).length < 1;
});
// watch
watch(useInst, (newValue) => {
  // 當 useInst 變化時，清理現有實例並重新初始化
  clearPayuniSdk();
  initPayment();
});
// method
// destroy SDK
const clearPayuniSdk = () => {
  if (payuniInstance) {
    document.querySelectorAll(".ifr_input").forEach((container) => {
      container.innerHTML = "";
    });
    payuniInstance = null;
    canSubmit.value = false;
  }
};
// 初始化 SDK與運行
const initPayment = async () => {
  if (!setToken.value) {
    console.error("未設置 Token");
    return;
  }
  if (!window.UniPayment) {
    console.error("SDK 未載入");
    return;
  }
  const initOption = getInitOption();
  payuniInstance = window.UniPayment.createSession(setToken.value, initOption);
  payuniInstance.onUpdate(function (update) {
    if (update.status) {
      console.log(`
        Input 狀態：
        cardNumberStatus: ${update.status.CardNo}
        cardExpiryStatus: ${update.status.CardExp}
        ccvStatus: ${update.status.CardCvc}
      `);
      canSubmit.value = Object.values(update.status).every(
        (value) => value === true
      );
    }
  });

  try {
    const resp = await payuniInstance.start();
    console.log("回傳狀態:", resp);
    if (useInst.value && emptyInstOption.value) {
      fetchCardAcceptInfo();
    }
  } catch (error) {
    console.error("啟動 SDK 失敗:", error);
  }
};
// 取得分期紅利資訊
const fetchCardAcceptInfo = async () => {
  if (!payuniInstance) return;
  try {
    const resp = await payuniInstance.getCardAcceptInfo();
    creditInstOptions.value = resp.CreditInst || {};
    creditResList.value = resp.CreditRed || {};
  } catch (e) {
    console.error("取得分期資訊失敗:", e);
  }
};
// 送出交易
const buttonSubmit = async () => {
  if (!payuniInstance || !canSubmit.value) return;

  isSubmitting.value = true;

  try {
    const resp = await payuniInstance.getTradeResult({
      useRed: useCreditRed.value,
      cardInst: selectedInst.value,
    });

    console.log(`回傳結果: ${JSON.stringify(resp)}`);
  } catch (e) {
    console.error("付款失敗:", e);
  } finally {
    isSubmitting.value = false;
  }
};
onMounted(() => {
  //此範例在 public/index.html 有載入 sdk 網址，您也可以選擇 onMounted 時 引入 UniPayment SDK
  // const scriptElement = document.createElement('script');
  // scriptElement.src = 'https://vendor.payuni.com.tw/sdk/uni-payment.js';
  // scriptElement.onload = initPayment;
  // document.body.appendChild(scriptElement);
  initPayment();
});
</script>

<template>
  <div class="m-3">
    <div class="mb-3">
      <input
        type="checkbox"
        class="form-check-input mb-3"
        id="useInstCheck"
        v-model="useInst"
      />
      <label class="form-check-label" for="useInstCheck"
        >啟用分期/紅利功能</label
      >
      <div class="inst-red-area mb-3" v-show="useInst">
        <select
          class="form-select"
          id="card_inst"
          :disabled="emptyInstOption"
          v-model="selectedInst"
        >
          <option value="" selected>選擇期數</option>
          <option v-for="(_, key) in creditInstOptions" :key="key" :value="key">
            {{ key }}
          </option>
        </select>
        <div class="mt-3">
          <input
            type="checkbox"
            class="form-check-input"
            id="useRedCheck"
            v-model="useCreditRed"
          />
          <label class="form-check-label" for="useRedCheck">紅利折抵</label>
          <a href="#" style="font-size: 12px" :title="creditResList"
            >(查看可紅利折抵銀行)</a
          >
        </div>
      </div>
    </div>

    <hr />
    <div class="payment-form">
      <div class="mb-3">
        <label class="mb-1">信用卡號碼</label>
        <div class="ifr_input" id="put_card_no"></div>
      </div>
      <div class="mb-3">
        <label class="mb-1">有效期限</label>
        <div class="ifr_input" id="put_card_exp"></div>
      </div>
      <div class="mb-3">
        <label class="mb-1">安全碼</label>
        <div class="ifr_input" id="put_card_cvc"></div>
      </div>
    </div>
    <button
      id="payButton"
      class="w-100 btn mt-3"
      :class="canSubmit ? `btn-primary` : `btn-secondary`"
      @click="buttonSubmit"
      :disabled="!canSubmit"
    >
      付款
    </button>
  </div>
</template>
