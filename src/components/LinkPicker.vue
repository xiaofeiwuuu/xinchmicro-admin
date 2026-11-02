<template>
  <div class="link-picker">
    <a-radio-group :value="type" size="small" @change="onTypeChange">
      <a-radio-button value="none">不跳转</a-radio-button>
      <a-radio-button value="category">产品分类</a-radio-button>
      <a-radio-button value="catalog">产品目录</a-radio-button>
      <a-radio-button value="product">产品详情</a-radio-button>
      <a-radio-button value="custom">其他链接</a-radio-button>
    </a-radio-group>

    <a-select
      v-if="type === 'category'"
      class="lp-field"
      show-search
      allow-clear
      option-filter-prop="children"
      placeholder="选择产品分类（可输入名称搜索）"
      :value="id"
      :loading="loadingBase"
      @change="onPick"
    >
      <a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
    </a-select>

    <a-select
      v-else-if="type === 'catalog'"
      class="lp-field"
      show-search
      allow-clear
      option-filter-prop="children"
      placeholder="选择产品目录（可输入名称搜索）"
      :value="id"
      :loading="loadingBase"
      @change="onPick"
    >
      <a-select-option v-for="c in catalogs" :key="c.id" :value="c.id">{{ catalogLabel(c) }}</a-select-option>
    </a-select>

    <a-select
      v-else-if="type === 'product'"
      class="lp-field"
      show-search
      allow-clear
      :filter-option="false"
      :not-found-content="searching ? '搜索中...' : '没有找到产品'"
      placeholder="输入产品名称搜索"
      :value="id"
      :loading="searching"
      @search="onSearch"
      @change="onPick"
    >
      <a-select-option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.label }}</a-select-option>
    </a-select>

    <a-input
      v-else-if="type === 'custom'"
      class="lp-field"
      :value="custom"
      allow-clear
      placeholder="外部网址（http 开头）或小程序页面路径（/pages/... 开头）"
      @change="onCustomInput"
    />

    <div class="lp-tip">{{ tip }}</div>
  </div>
</template>

<script>
import { getCategories, getCatalogs, getProducts, getProductById } from '@/api';
import { buildLink, parseLink, LINK_TYPES } from '@/utils/carouselLink';

const asList = (res) => (Array.isArray(res) ? res : (res && res.list) || []);
const productLabel = (p) => (p.catalog && p.catalog.name ? `${p.name}（${p.catalog.name}）` : p.name);

export default {
  name: 'LinkPicker',
  props: { value: { type: String, default: '' } },
  data() {
    return {
      type: LINK_TYPES.none,
      id: undefined,
      custom: '',
      categories: [],
      catalogs: [],
      productOptions: [],
      loadingBase: false,
      searching: false,
      searchSeq: 0,
      timer: null
    };
  },
  computed: {
    tip() {
      if (this.type === 'none') return '点击轮播图不会跳转。';
      if (this.type === 'custom') return '以 http 开头的外部网址在小程序里不能直接打开，点击后只会复制网址；也可以手写小程序页面路径。底部标签页（首页、搜索、公司）不能作为跳转目标。';
      return this.value ? `将生成的链接：${this.value}` : '请选择跳转目标。';
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(v) {
        // 自己发出的变化不需要还原（否则会把正在输入的内容覆盖）
        if (v === this.lastEmitted) return;
        this.sync(v);
      }
    }
  },
  created() {
    this.loadBase();
  },
  beforeDestroy() {
    clearTimeout(this.timer);
  },
  methods: {
    emit(link) {
      this.lastEmitted = link;
      this.$emit('input', link);
    },
    sync(link) {
      const p = parseLink(link);
      this.type = p.type;
      this.id = p.id;
      this.custom = p.custom;
      // 旧数据里的占位「无」改成真正的空值，避免小程序把它当页面路径去跳
      if (p.type === LINK_TYPES.none && link) this.emit('');
      if (p.type === LINK_TYPES.product) this.loadSelectedProduct(p.id);
    },
    async loadBase() {
      this.loadingBase = true;
      try {
        const [cs, ts] = await Promise.all([getCategories(), getCatalogs()]);
        this.categories = asList(cs);
        this.catalogs = asList(ts);
      } catch (e) {
        // 请求层已经提示过错误
      } finally {
        this.loadingBase = false;
      }
    },
    catalogLabel(c) {
      return c.category && c.category.name ? `${c.category.name} / ${c.name}` : c.name;
    },
    // 已保存的产品：取一次产品信息，下拉框才能显示名称而不是一个数字
    async loadSelectedProduct(id) {
      if (this.productOptions.some((o) => o.id === id)) return;
      try {
        const p = await getProductById(id);
        if (p && p.id === id && this.type === LINK_TYPES.product) {
          this.productOptions = [{ id: p.id, label: productLabel(p) }, ...this.productOptions];
        }
      } catch (e) {
        // 产品已被删除等：下拉框显示数字 ID，保存的链接保持不变
      }
    },
    onTypeChange(e) {
      this.type = e.target.value;
      this.id = undefined;
      if (this.type === LINK_TYPES.custom) this.emit(this.custom);
      else this.emit('');
      if (this.type === LINK_TYPES.product && !this.productOptions.length) this.search('');
    },
    onPick(id) {
      this.id = id;
      if (id === undefined || id === null) return this.emit('');
      let name = '';
      if (this.type === LINK_TYPES.category) name = (this.categories.find((c) => c.id === id) || {}).name;
      if (this.type === LINK_TYPES.catalog) name = (this.catalogs.find((c) => c.id === id) || {}).name;
      this.emit(buildLink(this.type, id, name));
    },
    onCustomInput(e) {
      this.custom = e.target.value;
      this.emit(this.custom.trim());
    },
    onSearch(keyword) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.search(keyword), 300);
    },
    async search(keyword) {
      const seq = ++this.searchSeq;
      this.searching = true;
      try {
        const res = await getProducts({ name: keyword || '', page: 1, pageSize: 20 });
        if (seq !== this.searchSeq) return; // 只采用最后一次搜索的结果
        const list = asList(res).map((p) => ({ id: p.id, label: productLabel(p) }));
        // 已选中的产品始终保留在选项里，否则搜索别的词时已选项会变成数字
        const picked = this.productOptions.find((o) => o.id === this.id);
        this.productOptions = picked && !list.some((o) => o.id === picked.id) ? [picked, ...list] : list;
      } catch (e) {
        // 请求层已经提示过错误
      } finally {
        if (seq === this.searchSeq) this.searching = false;
      }
    }
  }
};
</script>

<style scoped>
.lp-field { display: block; width: 100%; margin-top: 8px; }
.lp-tip { margin-top: 4px; color: rgba(0, 0, 0, 0.45); font-size: 12px; line-height: 1.6; word-break: break-all; }
</style>
