```json
{
  "date": "2020.07.28 20:00",
  "tags": ["vue","编码思考"],
  "description":"我们有一个显示表格的 Index.vue 页面，并要为此编写一个弹窗组件(dialog)用于新增、预览或者编辑表格的一行数据，因为 vue 组件是单向数据流，我们常常会将一些数据传入组件，诸如 editDialogShow、editRowData、isPreView等等更多,这看起来没有什么问题，但是当 Index.vue 页面越来越复杂的时候，你的 data 里散落各种各样的数据，时间一长，维护起来特别麻烦，可能聪明的你会将数据分类好，将弹窗相关的数据全部放在 data 的 dialog对象里面，那有没有更好的方法，或者说希望组件做更多的事"
}
```

我们有一个显示表格的 Index.vue 页面，并要为此编写一个弹窗组件(dialog)用于新增、预览或者编辑表格的一行数据，因为 vue 组件是单向数据流，我们常常会将一些数据传入组件，诸如 editDialogShow、editRowData、isPreView等等更多,这看起来没有什么问题，但是当 Index.vue 页面越来越复杂的时候，你的 data 里散落各种各样的数据，时间一长，维护起来特别麻烦，可能聪明的你会将数据分类好，将弹窗相关的数据全部放在 data 的 dialog对象里面，那有没有更好的方法，或者说希望组件做更多的事

像上面的场景，在预览和编辑的时候，我们需要传入 Index.vue 页面表格的一行数据 editRowData，预览的时候还需要将 isPreView 置为 true. 因为 isPreView 避免我们编辑内容和显示编辑按钮。
在新增的时候我们可以添加字段表示或者将editRowData 置为空来判断，当然我们也可以在组件内包含更多的业务逻辑，避免父组件维护过多的数据和业务代码，这两种方式都没有谁对谁错，使用哪一种取决于你对实际业务场景的判断。

现在来看看下面这种弹窗。

```javascript
<template>
  <el-dialog
    custom-class="communication-record"
    :visible.sync="showElDialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div slot="title" class="title">
      <div>{{ elDialogTitle }}</div>
      <i class="el-icon-close" @click="showElDialog = false"></i>
    </div>
    <el-form
      :disabled="isPreView"
      :model="form"
      :rules="rules"
      ref="ruleForm"
      label-width="100px"
      size="small"
    >
      <el-form-item label="标题：" prop="title">
        <el-input v-model="form.title" placeholder="请输入标题"></el-input>
      </el-form-item>
      <el-form-item label="项目：">
        <KeySelect
          v-model="form.projectId"
          :diyCode="'id'"
          :optionArr="projectArr"
          @changeSelectObj="changeProject"
          placeholder="请选择项目"
        />
      </el-form-item>
      <el-form-item label="项目阶段：">
        <KeySelect
          v-model="form.stageId"
          :diyCode="'id'"
          :optionArr="phaseArr"
          @changeSelectObj="changePhase"
          placeholder="请选择项目阶段"
        />
      </el-form-item>
      <el-form-item label="内容：" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          placeholder="请输入内容"
          maxlength="300"
          class="textarea"
          :rows="6"
          show-word-limit
        ></el-input>
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="showElDialog = false" size="small">{{
        isPreView ? "关 闭" : "取 消"
      }}</el-button>
      <el-button
        type="primary"
        v-if="!isPreView"
        size="small"
        @click="submit('ruleForm')"
        >确 定</el-button
      >
    </span>
  </el-dialog>
</template>
<script>
import {
  addCustomerCommunicationRecord,
  updateCustomerCommunicationRecord
} from "@/api/keyAccountManage/client/index.js";
import {
  listProjectDict,
  listProjectNodeDict
} from "@/api/keyAccountManage/customer.js";
import {
  Required,
  RequiredAndNumber,
  RequiredAndPhone,
  FillerFieldRules
} from "@/utils/validateRules.js";
export default {
  data() {
    return {
      elDialogTitle: "",
      showElDialog: false,
      isPreView: false,
      form: {},
      rules: {
        config: [{ max: 300, message: "最多300个字符", trigger: "blur" }],
        phone: RequiredAndPhone,
        price: RequiredAndNumber,
        ...FillerFieldRules(["content", "title"], Required)
      },
      projectArr: [],
      phaseArr: []
    };
  },
  created() {
    listProjectDict()
      .then(r => {
        this.projectArr = r;
      })
      .catch(() => {});
  },
  methods: {
    //首字母大写为外部可用方法
    AddRecord() {
      this.form = {};
      this.elDialogTitle = "添加沟通记录";
      this.isPreView = false;
      this.showElDialog = true;
      this.$nextTick(() => {
        this.$refs["ruleForm"].clearValidate();
      });
    },
    Preview(row) {
      this.form = row;
      this.elDialogTitle = "查看沟通记录";
      this.isPreView = true;
      this.showElDialog = true;
      this.changeProject({ name: row.projectName, id: row.projectId });
      this.$nextTick(() => {
        this.$refs["ruleForm"].clearValidate();
      });
    },
    EditRecord(row) {
      this.form = row;
      this.elDialogTitle = "编辑沟通记录";
      this.isPreView = false;
      this.showElDialog = true;
      this.changeProject({ name: row.projectName, id: row.projectId });
      this.$nextTick(() => {
        this.$refs["ruleForm"].clearValidate();
      });
    },
    submit(formName) {
      this.$refs[formName].validate(valid => {
        if (!valid) {
          this.$message({
            message: "请按照提示正确填写内容！",
            type: "warning"
          });
          return;
        }
        let reqFunc = null;
        let tip = "";
        if (!this.form.id) {
          tip = "添加成功";
          reqFunc = addCustomerCommunicationRecord;
        } else {
          tip = "修改成功";
          reqFunc = updateCustomerCommunicationRecord;
        }
        reqFunc({ ...this.form, customerId: this.$route.query.id })
          .then(() => {
            this.$message(tip);
            this.showElDialog = false;
            this.$emit("editSuccess");
          })
          .catch(() => {});
      });
    },
    changeProject(val) {
      this.form.projectName = val.name;
      listProjectNodeDict({ id: val.id })
        .then(r => {
          this.phaseArr = r;
        })
        .catch(() => {});
    },
    changePhase(val) {
      this.form.stageName = val.name;
    }
  }
};
</script>
<style lang="scss">
.communication-record {
  width: 500px;
  .title {
    display: flex;
    justify-content: space-between;
    i {
      cursor: pointer;
    }
  }
}
</style>

```

如你所见，使用此组件甚至连显示和隐藏的控制都不需要了，受 golang 的影响，我自作聪明的将外部使用的方法首字母大写了，表示非私密方法。
在 Index.vue 我们只需要提供一个方法

html：
```html
<Record ref="recordDialog" @editSuccess="getTableData()" />
```

js:
```javascript
recordEdit(row = null, isPreView = false) {
      if (row === null) {
        this.$refs["recordDialog"].AddRecord();
        return;
      }
      if (isPreView && row) {
        this.$refs["recordDialog"].Preview(cloneDeep(row));
        return;
      }
      this.$refs["recordDialog"].EditRecord(cloneDeep(row));
    },
```

它包含了新增，预览和编辑。因此，新增的时候只需执行```@click="recordEdit(null)"```，编辑``` @click="recordEdit(scope.row)" ```,预览 ``` @click="recordEdit(scope.row, true)"```,这样我们甚至不需要在 Index.vue 添加任何数据，在维护 Index.vue 时，大大减轻了我们的心里负担。
