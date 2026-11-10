// Ant Design Vue 按需引入：只注册项目里实际用到的组件和样式。
// 新增页面用到没在这里注册的 a-xxx 组件时，需要在此补上（组件 + 对应的 style/css）。
import Vue from 'vue';

import Affix from 'ant-design-vue/lib/affix';
import Alert from 'ant-design-vue/lib/alert';
import Breadcrumb from 'ant-design-vue/lib/breadcrumb';
import Button from 'ant-design-vue/lib/button';
import Card from 'ant-design-vue/lib/card';
import Checkbox from 'ant-design-vue/lib/checkbox';
import ConfigProvider from 'ant-design-vue/lib/config-provider';
import DatePicker from 'ant-design-vue/lib/date-picker';
import Divider from 'ant-design-vue/lib/divider';
import Form from 'ant-design-vue/lib/form';
import FormModel from 'ant-design-vue/lib/form-model';
import { Row, Col } from 'ant-design-vue/lib/grid';
import Icon from 'ant-design-vue/lib/icon';
import Input from 'ant-design-vue/lib/input';
import InputNumber from 'ant-design-vue/lib/input-number';
import Layout from 'ant-design-vue/lib/layout';
import Dropdown from 'ant-design-vue/lib/dropdown';
import Menu from 'ant-design-vue/lib/menu';
import message from 'ant-design-vue/lib/message';
import Modal from 'ant-design-vue/lib/modal';
import Popconfirm from 'ant-design-vue/lib/popconfirm';
import Progress from 'ant-design-vue/lib/progress';
import Radio from 'ant-design-vue/lib/radio';
import Result from 'ant-design-vue/lib/result';
import Select from 'ant-design-vue/lib/select';
import Space from 'ant-design-vue/lib/space';
import Spin from 'ant-design-vue/lib/spin';
import Statistic from 'ant-design-vue/lib/statistic';
import Switch from 'ant-design-vue/lib/switch';
import Table from 'ant-design-vue/lib/table';
import Tag from 'ant-design-vue/lib/tag';
import Tooltip from 'ant-design-vue/lib/tooltip';
import Upload from 'ant-design-vue/lib/upload';

import 'ant-design-vue/lib/affix/style/css';
import 'ant-design-vue/lib/alert/style/css';
import 'ant-design-vue/lib/breadcrumb/style/css';
import 'ant-design-vue/lib/button/style/css';
import 'ant-design-vue/lib/dropdown/style/css';
import 'ant-design-vue/lib/card/style/css';
import 'ant-design-vue/lib/checkbox/style/css';
import 'ant-design-vue/lib/config-provider/style/css';
import 'ant-design-vue/lib/date-picker/style/css';
import 'ant-design-vue/lib/divider/style/css';
import 'ant-design-vue/lib/form/style/css';
import 'ant-design-vue/lib/form-model/style/css';
import 'ant-design-vue/lib/grid/style/css';
import 'ant-design-vue/lib/icon/style/css';
import 'ant-design-vue/lib/input/style/css';
import 'ant-design-vue/lib/input-number/style/css';
import 'ant-design-vue/lib/layout/style/css';
import 'ant-design-vue/lib/menu/style/css';
import 'ant-design-vue/lib/message/style/css';
import 'ant-design-vue/lib/modal/style/css';
import 'ant-design-vue/lib/popconfirm/style/css';
import 'ant-design-vue/lib/progress/style/css';
import 'ant-design-vue/lib/radio/style/css';
import 'ant-design-vue/lib/result/style/css';
import 'ant-design-vue/lib/select/style/css';
import 'ant-design-vue/lib/space/style/css';
import 'ant-design-vue/lib/spin/style/css';
import 'ant-design-vue/lib/statistic/style/css';
import 'ant-design-vue/lib/switch/style/css';
import 'ant-design-vue/lib/table/style/css';
import 'ant-design-vue/lib/tag/style/css';
import 'ant-design-vue/lib/tooltip/style/css';
import 'ant-design-vue/lib/upload/style/css';

[
  Affix, Alert, Breadcrumb, Button, Card, Checkbox, ConfigProvider, DatePicker, Divider, Form, FormModel,
  Dropdown, Icon, Input, InputNumber, Layout, Menu, Modal, Popconfirm, Progress, Radio, Result, Select, Space,
  Spin, Statistic, Switch, Table, Tag, Tooltip, Upload,
].forEach(c => Vue.use(c));

// Grid 没有 install，手动注册
Vue.component(Row.name, Row);
Vue.component(Col.name, Col);

// 全局方法：整包引入时 antd 会把它们挂到原型上，按需引入需要自己挂
// （漏了 $confirm 的话，所有"确认删除"弹窗都会报 this.$confirm is not a function）
Vue.prototype.$message = message;
Vue.prototype.$info = Modal.info;
Vue.prototype.$success = Modal.success;
Vue.prototype.$error = Modal.error;
Vue.prototype.$warning = Modal.warning;
Vue.prototype.$confirm = Modal.confirm;
Vue.prototype.$destroyAll = Modal.destroyAll;
