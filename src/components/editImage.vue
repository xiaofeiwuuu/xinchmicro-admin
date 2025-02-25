<template>
    <div>
        <!-- <input type="file" @change="onFileChange" accept="image/*" /> -->
        <div style="display: flex;justify-content: space-between;position: relative;">
            <div class="canvas-container">
                <canvas style="border: 1px solid #ccc;" ref="canvas" @mousedown="startDrawing" @mousemove="draw"
                    @mouseup="stopDrawing"></canvas>
            </div>
            <div style="width: 400px;height: calc(100vh - 105px); overflow: hidden; display: flex;flex-direction: column;">
                <div style="margin-bottom: 10px;" v-if="selection.x" >
                    <a-button type="primary" @click="addTextObject" size="small">
                        添加热区
                    </a-button>
                </div>
                <div style="flex: 1; overflow: auto;">
                    <div v-for="(textObj, index) in textObjects" :key="'w2' + index">
                        <a-card :title="'热区文本' + (index + 1)" size="small">
                            <a-button type="link" slot="extra" style="color: red;"
                                @click="removeTextObject(index)">
                                删除
                            </a-button>

                            <div class="text-info">
                                <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="url" class="label-text">跳转图片:</label>
                                    <a-select class="input-width" placeholder="请选择跳转图片(ID)" :labelInValue="true"
                                        :value="textObj.url[0]" @focus="focus(textObj)" size="small"
                                        @change="changeIn2($event, textObj)">
                                        <a-select-option v-for="(item, i) in allData" :key="'q2' + i+ index" :value="item.id"
                                            :label="item.id">
                                            {{ item.id }}
                                        </a-select-option>
                                    </a-select>
                                </div>
                            </div>
                            <div class="text-info">
                                <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="colorPicker" class="label-text">颜色:</label>
                                    <input class="input-width" type="color" id="colorPicker" v-model="textObj.color"
                                        @input="updateCanvasText" />
                                </div>
                                <!-- <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="font_size" class="label-text">大小:</label>
                                    <input type="number" placeholder="字体大小" id="font_size"
                                        v-model="textObj.font_size" @input="updateCanvasText" />
                                </div> -->
                            </div>
                            <div class="text-info">
                                <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="x" class="label-text">X (%):</label>
                                    <input class="input-width" type="number" placeholder="X定位" id="x" v-model="textObj.x"
                                        @input="updateCanvasText" />
                                </div>
                                <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="y" class="label-text">Y (%):</label>
                                    <input class="input-width" type="number" placeholder="Y定位" id="y" v-model="textObj.y"
                                        @input="updateCanvasText" />
                                </div>
                            </div>
                            <div class="text-info">
                                <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="width" class="label-text">宽度:</label>
                                    <input class="input-width" type="number" placeholder="热区宽度" id="width" v-model="textObj.width"
                                        @input="updateCanvasText" />
                                </div>
                                <div style="display: flex;justify-content: left;width: 50%;">
                                    <label for="height" class="label-text">高度:</label>
                                    <input class="input-width" type="number" placeholder="热区高度" id="height" v-model="textObj.height"
                                        @input="updateCanvasText" />
                                </div>
                            </div>
                        </a-card>
                        <!-- <button @click="removeTextObject(index)">删除</button> -->
                        <!-- <a-divider>With Text</a-divider> -->
                    </div>
                </div>
            </div>

            <div
                style="width: 180px;overflow: auto; height: calc(100vh - 105px);display: flex;flex-wrap: wrap;justify-content: space-between;align-items: top;gap: 10px;">
                <div v-for="(item, index) in allData" :key="index+'w3'"
                    style="width: 180px;height: 180px;position: relative;overflow: hidden;">
                    <div
                        style="position: absolute;top: 10px;left: 10px;color: red;width: 40px;height: 40px;border: 1px solid #ccc;border-radius: 50%;display: flex;justify-content: center;align-items: center;background-color: rgba(255, 255, 255, 0.5);">
                        {{ item.id }}</div>
                    <img :src="item.image_url" @click="previewImage(item.image_url)" style="width: 100%;height: 100%;object-fit:cover;cursor: pointer;"
                        :alt="item.id" />
                </div>
            </div>
        </div>

        <div v-if="isDrawing" class="selection" :style="selectionStyle"></div>
        <div style="margin-top: 10px;text-align: right;position: absolute;bottom: 30px;width: 100%;right: 50px;">
            <a-button type="default" size="small" @click="cancel" style="margin-right: 20px;width: 80px;">
                取消
            </a-button>
            <a-button type="primary" style="width: 80px;" :loading="loading" size="small" @click="saveSelection">
                保 存
            </a-button>
        </div>

        <!-- 图片预览模态框 -->
        <a-modal :visible="previewVisible" :footer="null" @cancel="closePreview" :zIndex="1002">
            <img alt="preview" style="width: 100%;max-width: 80vw;max-height: 80vh;" :src="currentPreviewImage" />
        </a-modal>
    </div>
</template>

<script>
import { setImageHotArea } from '@/api'
export default {
    data() {
        return {
            loading: false,
            top: 10,
            image: null,
            startX: 0,
            startY: 0,
            isDrawing: false,
            selection: {},
            canvasWidth: 800, // 修改为更宽的尺寸
            canvasHeight: 600, // 修改为符合4:3比例的高度
            selectedColor: 'red', // 默认颜色为红色
            currentText: '', // 当前输入的描述文字
            currentFontSize: 16, // 当前字体大小
            currentWidth: 100, // 当前宽度
            currentHeight: 30, // 当前高度
            textInfoVisible: false, // 控制描述文字输入框的显示
            textObjects: [], // 存储多个文字对象
            selectedTextObject: null, // 当前选中的文字对象
            selectedItems: [],
            offsetX: 0,
            offsetY: 0,
            imgWidth: 0,
            imgHeight: 0,
            // 添加预览相关的数据
            previewVisible: false,
            currentPreviewImage: '',
        };
    },
    props: {
        imageUrl: {
            type: String,
            default: '',
        },
        id: {
            type: [String, Number],
            default: '',
        },
        hot_area_data: {
            type: Array,
            default: [],
        },
        allData: {
            type: Array,
            default: [],
        },
    },
    computed: {
        selectionStyle() {
            return {
                position: 'absolute',
                border: `2px dashed ${this.selectedColor}`, // 使用选定的颜色
                left: `${this.selection.x}px`,
                top: `${this.selection.y}px`,
                width: `${this.selection.width}px`,
                height: `${this.selection.height}px`,
                pointerEvents: 'none',
            };
        },
    },
    watch: {
        hot_area_data: {
            handler(newVal) {
                this.textObjects = newVal || [];
            },
            deep: true,
            immediate: true,
        }
    },
    mounted() {
        this.onFileChange()
    },
    methods: {
        changeIn2(value, textObj) {
            textObj.url = value ? [value] : []
            this.selectedItems = textObj.url
            this.$forceUpdate();
        },
        onFileChange(event) {
            this.image = new Image();
            this.image.src = this.imageUrl;
            this.image.onload = () => {
                // 计算缩放比例
                const imgScale = this.image.width / this.image.height
                let newWidth = undefined;
                let newHeight = undefined;
                // 计算缩放比例
                if (this.image.width > this.image.height) {
                    // 图片宽度大于高度，短边是高度
                    this.imgHeight = this.canvasHeight; // 确保短边（高度）填满父元素
                    this.imgWidth = this.imgHeight * imgScale; // 根据宽高比计算宽度
                    if (this.imgWidth < this.canvasWidth) {
                        this.imgWidth = this.canvasWidth
                        this.imgHeight = this.imgWidth / imgScale
                    }
                } else {
                    // 图片高度大于或等于宽度，短边是宽度
                    this.imgWidth = this.canvasWidth; // 确保短边（宽度）填满父元素
                    this.imgHeight = this.imgWidth / imgScale; // 根据宽高比计算高度
                    if (this.imgHeight < this.canvasHeight) {
                        this.imgHeight = this.canvasHeight
                        this.imgWidth = this.imgHeight * imgScale
                    }
                }
                // 设置canvas的宽高
                const canvas = this.$refs.canvas;
                canvas.width = this.canvasWidth;
                canvas.height = this.canvasHeight;

                this.drawImageToCanvas(this.imgWidth, this.imgHeight);
                this.textObjects.forEach(textObj => {
                    const url = this.allData.filter(item => textObj.url.includes(item.id)).map(item => ({
                        key: item.id,
                        label: item.image_name,
                    }))
                    this.$set(textObj, 'url', url)
                })
            };
        },
        focus(textObj) {
            this.selectedItems = textObj.url
        },
        drawImageToCanvas(newWidth, newHeight) {
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');
            // 新建偏移量
            if (newWidth > this.canvasWidth) {
                this.offsetX = -(newWidth - this.canvasWidth) / 2
            }
            if (newHeight > this.canvasHeight) {
                this.offsetY = -(newHeight - this.canvasHeight) / 2
            }
            // 清空画布并绘制图片
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.image, this.offsetX, this.offsetY, newWidth, newHeight);

            // 绘制所有文字对象
            this.textObjects.forEach(textObj => {
                ctx.fillStyle = textObj.color || 'red'; // 使用每个文字对象的颜色
                ctx.font = `16px Arial`; // 使用每个文字对象的字体大小
                const absoluteX = (textObj.x / 100) * canvas.width; // 将百分比转换为绝对坐标
                const absoluteY = (textObj.y / 100) * canvas.height; // 将百分比转换为绝对坐标
                ctx.fillText("", absoluteX, absoluteY); // 在指定位置绘制文字

                // 绘制边框
                ctx.strokeStyle = textObj.color || 'blue'; // 边框颜色
                const absoluteWidth = (textObj.width / 100) * canvas.width; // 将百分比转换为绝对宽度
                const absoluteHeight = (textObj.height / 100) * canvas.height; // 将百分比转换为绝对高度
                ctx.strokeRect(absoluteX, absoluteY, absoluteWidth, absoluteHeight); // 绘制边框
            });
        },
        handleCanvasClick(event) {
            const canvas = this.$refs.canvas;
            const clickX = event.offsetX;
            const clickY = event.offsetY;

            // 检查点击位置是否在某个文字对象内
            const clickedTextObject = this.textObjects.find(textObj => {
                return (
                    clickX >= textObj.x &&
                    clickX <= textObj.x + textObj.width &&
                    clickY >= textObj.y - textObj.font_size &&
                    clickY <= textObj.y
                );
            });

            if (clickedTextObject) {
                // 如果点击了已有的文字对象，选中它并显示其信息
                this.selectedTextObject = clickedTextObject;
                this.currentText = clickedTextObject.text;
                this.currentFontSize = clickedTextObject.font_size;
                this.currentWidth = clickedTextObject.width;
                this.currentHeight = clickedTextObject.height;
                this.textInfoVisible = true; // 显示描述文字输入框
            } else {
                // 如果没有点击到文字对象，重置选中状态
                this.selectedTextObject = null;
                this.textInfoVisible = false; // 隐藏描述文字输入框
            }
        },
        startDrawing(event) {
            const canvas = this.$refs.canvas;
            this.startX = event.offsetX;
            this.startY = event.offsetY;
            this.isDrawing = true;
            this.selection = { x: this.startX, y: this.startY, width: 0, height: 0 };
        },
        draw(event) {
            if (!this.isDrawing) return;
            const currentX = event.offsetX;
            const currentY = event.offsetY;
            this.selection.width = currentX - this.startX;
            this.selection.height = currentY - this.startY;

            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
            this.drawImageToCanvas(this.imgWidth, this.imgHeight); // 重新绘制图片
            ctx.strokeStyle = this.selectedColor; // 使用选定的颜色
            ctx.strokeRect(this.selection.x, this.selection.y, this.selection.width, this.selection.height);
        },
        stopDrawing() {
            this.isDrawing = false;
            // 在选择区域后，显示输入框以输入文本
            if (this.selection.width > 0 && this.selection.height > 0) {
                this.currentText = ''; // 清空当前文本
                this.currentFontSize = 16; // 重置字体大小
                this.currentWidth = this.selection.width; // 设置宽度为选择区域的宽度
                this.currentHeight = this.selection.height; // 设置高度为选择区域的高度
                this.textInfoVisible = true; // 显示描述文字输入框
            }
        },
        addTextObject() {
            // 添加新的文字对象
            this.textObjects.push({
                text: this.currentText,
                color: this.selectedColor,
                font_size: this.currentFontSize,
                x: ((this.selection.x / this.$refs.canvas.width) * 100).toFixed(2), // 将绝对坐标转换为百分比
                y: ((this.selection.y / this.$refs.canvas.height) * 100).toFixed(2), // 将绝对坐标转换为百分比
                width: ((this.currentWidth / this.$refs.canvas.width) * 100).toFixed(2), // 将宽度转换为百分比
                height: ((this.currentHeight / this.$refs.canvas.height) * 100).toFixed(2), // 将高度转换为百分比
            });
            this.updateCanvasText(); // 更新画布上的文字
            this.currentText = ''; // 清空当前输入
        },
        updateCurrentText() {
            if (this.selectedTextObject) {
                this.selectedTextObject.text = this.currentText;
                this.updateCanvasText(); // 更新画布上的文字
            }
        },
        updateCurrentFontSize() {
            if (this.selectedTextObject) {
                this.selectedTextObject.font_size = this.currentFontSize;
                this.updateCanvasText(); // 更新画布上的文字
            }
        },
        updateCurrentWidth() {
            if (this.selectedTextObject) {
                this.selectedTextObject.width = this.currentWidth;
                this.updateCanvasText(); // 更新画布上的文字
            }
        },
        updateCurrentHeight() {
            if (this.selectedTextObject) {
                this.selectedTextObject.height = this.currentHeight;
                this.updateCanvasText(); // 更新画布上的文字
            }
        },
        updateTextObject() {
            if (this.selectedTextObject) {
                this.selectedTextObject.text = this.currentText;
                this.selectedTextObject.font_size = this.currentFontSize;
                this.selectedTextObject.width = this.currentWidth;
                this.selectedTextObject.height = this.currentHeight;
                this.updateCanvasText(); // 更新画布上的文字
            }
        },
        removeTextObject(index) {
            // 删除指定的文字对象
            this.textObjects.splice(index, 1);
            this.updateCanvasText(); // 更新画布上的文字
        },
        saveSelection() {
            // 这里可以处理保存逻辑，例如上传到服务器
            if (!this.textObjects) {
                return this.$message.warning('请添加热区');
            }
            let isSave = true
            this.textObjects.forEach(textObj => {
                try {
                    textObj.x = parseFloat(textObj.x);
                    textObj.y = parseFloat(textObj.y);
                    textObj.width = parseFloat(textObj.width);
                    textObj.height = parseFloat(textObj.height);
                    textObj.url = textObj.url.map(item => Number(item.key))
                } catch (error) {
                    isSave = false
                }
            });
            if (!isSave) {
                return this.$message.warning('请确保所有的热区都选择了跳转图片');
            }
            if (this.id) {
                this.loading = true;
                setImageHotArea({
                    image_id: this.id,
                    hot_area: this.textObjects,
                }).then(res => {
                    this.$message.success('保存成功');
                    this.$emit('cancel');
                }).catch(err => {
                    this.$message.error(err.message);
                }).finally(() => {
                    this.loading = false;
                })
            }
        },
        cancel() {
            this.$emit('cancel');
        },
        updateCanvasText() {
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');
            this.selection = { x: 0, y: 0, width: 0, height: 0 }
            ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight); // 清空画布
            this.drawImageToCanvas(this.imgWidth, this.imgHeight); // 重新绘制图片
        },
        // 添加预览相关的方法
        previewImage(url) {
            this.currentPreviewImage = url;
            this.previewVisible = true;
        },
        closePreview() {
            this.previewVisible = false;
            this.currentPreviewImage = '';
        },
    },
};
</script>

<style lang="scss">
.selection {
    position: absolute;
    pointer-events: none;
}

.input-width {
    width: 80px !important;
}

.ant-card {
    .ant-card-head {
        min-height: unset;
        padding: 0 12px;
        
        .ant-card-head-wrapper {
            min-height: unset;

            .ant-card-extra{
                padding: 0;
            }
        }
        
        .ant-card-head-title {
            padding: 8px 0;
        }
    }
    
    .ant-card-body {
        padding: 12px;
    }
}

.text-info {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;

    .label-text {
        display: block;
        width: 40%;
        max-width: 80px;
        padding-left: 10px;
        box-sizing: border-box;
        height: 32px;
        line-height: 32px;
    }

    input {
        outline: none;
        border: none;
        background: none;
        border: 1px solid #ccc;
        width: 60%;
        max-width: 240px;
        padding: 0;
        margin: 0;
        padding-left: 12px;
        padding-right: 12px;
        box-sizing: border-box;
        border-radius: 4px;
        height: 32px;

        &:focus {
            border: 1px solid #40a9ff;
        }

    }
}
</style>