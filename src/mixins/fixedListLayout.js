// 列表页固定整页高度：整个页面不滚动，只有表格里的数据区滚动（表头固定、分页条固定在表格底部）。
//
// 用法（列表页）：
//   import fixedListLayout from '@/mixins/fixedListLayout'
//   export default { mixins: [fixedListLayout], ... }
//   <a-table :scroll="tableScroll" ...>
// 原理：量出表格上面的页头、筛选区占了多少，屏幕剩下的高度减去表头、分页条和底部留白，就是数据区的高度（tableScroll.y），
// 窗口大小变化、筛选区高度变化时重新算。算出来的高度太小（上面的内容占了大半个屏幕）时不锁定页面，退回普通的整页滚动，
// 免得下面的内容被截掉看不到。不是列表的页面（表单、设置）不用这个，照常整页滚动。

const MIN_Y = 140; // 数据区至少这么高才锁定整页（约两三行）
const HEAD_H = 55; // 取不到表头高度时的默认值
const PAGER_H = 64; // 分页条（含上下间距）
const BOTTOM_GAP = 44; // 表格卡片下内边距 + 页面底部留白
const SAFETY = 4; // 留几个像素余量，避免小数舍入造成整页多出一两个像素的滚动

let lockers = 0; // 同时有几个列表页要求锁定（路由切换时新旧页面会短暂重叠）
const setLocked = (on) => document.body.classList.toggle('fixed-list-locked', on);

// 最近的、真的在滚动的祖先元素（可能是整个窗口，也可能是布局容器）
function scrollParent(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = window.getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return window;
}

// 表格在可滚动区域里的位置（和当前滚动到哪里无关）和可见区域高度
function metrics(el) {
  const sp = scrollParent(el);
  const rect = el.getBoundingClientRect();
  if (sp === window) return { viewH: window.innerHeight, top: rect.top + window.pageYOffset };
  return { viewH: sp.clientHeight, top: rect.top - sp.getBoundingClientRect().top + sp.scrollTop };
}

export default {
  data() {
    return { tableScroll: { y: 320 } };
  },
  mounted() {
    this.$_flOnResize = () => this.$_flSchedule();
    window.addEventListener('resize', this.$_flOnResize);
    lockers += 1;
    this.$_flSchedule();
    // 页面上方的提示条、筛选区可能比表格晚出现，把表格往下顶了一点，稍后再校正一次
    this.$_flLater = setTimeout(() => this.$_flFit(), 800);
  },
  updated() {
    this.$_flSchedule(); // 筛选区、提示条变化会改变表格的位置
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.$_flOnResize);
    clearTimeout(this.$_flTimer);
    clearTimeout(this.$_flLater);
    lockers = Math.max(0, lockers - 1);
    if (lockers === 0) setLocked(false);
  },
  methods: {
    $_flSchedule() {
      if (this.$_flQueued) return;
      this.$_flQueued = true;
      requestAnimationFrame(() => {
        this.$_flQueued = false;
        this.$_flFit();
      });
    },
    $_flFit() {
      const wrap = this.$el && this.$el.querySelector && this.$el.querySelector('.ant-table-wrapper');
      if (!wrap) return;
      const thead = wrap.querySelector('.ant-table-thead');
      const head = thead ? thead.offsetHeight : HEAD_H;
      const m = metrics(wrap);
      const free = m.viewH - m.top - head - PAGER_H - BOTTOM_GAP - SAFETY;
      const fits = free >= MIN_Y;
      const y = Math.max(MIN_Y, Math.floor(free));
      if (Math.abs(this.tableScroll.y - y) >= 1) this.tableScroll = { y };
      setLocked(fits);
      // 表头和数据是两张表：数据区有竖向滚动条时它的内容区比表头窄一截，表头每一列就和下面的数据对不齐。
      // 滚动条宽度因浏览器、系统而异（有的是覆盖式、宽度 0），所以量出实际宽度，给表头留同样宽的右内边距
      const header = wrap.querySelector('.ant-table-header');
      const body = wrap.querySelector('.ant-table-body');
      if (header && body) {
        const bar = body.offsetWidth - body.clientWidth;
        header.style.paddingRight = bar > 0 ? `${bar}px` : '';
      }
    }
  }
};
