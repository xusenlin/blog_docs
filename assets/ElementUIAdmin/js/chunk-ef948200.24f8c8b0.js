(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-ef948200"],{"1af6":function(e,t,a){var l=a("63b6");l(l.S,"Array",{isArray:a("9003")})},"20fd":function(e,t,a){"use strict";var l=a("d9f6"),r=a("aebd");e.exports=function(e,t,a){t in e?l.f(e,t,r(0,a)):e[t]=a}},"363f":function(e,t,a){"use strict";var l=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("span",{staticStyle:{"margin-right":"6px"}},[e._l(e.value,function(t,l){return a("el-tag",{staticStyle:{"margin-right":"6px"},attrs:{closable:"","disable-transitions":!1},on:{close:function(t){return e.closeTag(l)}}},[e._v("\n    "+e._s(t.name)+"\n  ")])}),a("el-button",{attrs:{type:"primary",icon:"el-icon-plus",size:"small"},on:{click:function(t){e.dialogVisible=!0}}},[e._v("添加标签")]),a("el-dialog",{attrs:{title:"添加标签",visible:e.dialogVisible,width:"30%"},on:{"update:visible":function(t){e.dialogVisible=t}}},[a("div",[a("el-select",{staticStyle:{width:"100%","margin-bottom":"20px"},attrs:{placeholder:"选择一级标签"},model:{value:e.tags.one,callback:function(t){e.$set(e.tags,"one",t)},expression:"tags.one"}},[a("el-option",{attrs:{label:"一级标签",value:"1"}}),a("el-option",{attrs:{label:"一级标签3",value:"2"}}),a("el-option",{attrs:{label:"一级标签4",value:"3"}})],1),a("el-select",{staticStyle:{width:"100%","margin-bottom":"20px"},attrs:{placeholder:"选择二级标签"},model:{value:e.tags.two,callback:function(t){e.$set(e.tags,"two",t)},expression:"tags.two"}},[a("el-option",{attrs:{label:"二级标签",value:"4"}}),a("el-option",{attrs:{label:"二级标签3",value:"5"}}),a("el-option",{attrs:{label:"二级标签4",value:"7"}})],1),a("el-select",{staticStyle:{width:"100%","margin-bottom":"20px"},attrs:{placeholder:"选择三级标签"},model:{value:e.tags.three,callback:function(t){e.$set(e.tags,"three",t)},expression:"tags.three"}},[a("el-option",{attrs:{label:"三级标签",value:"8"}}),a("el-option",{attrs:{label:"三级标签3",value:"9"}}),a("el-option",{attrs:{label:"三级标签4",value:"10"}})],1)],1),a("span",{staticClass:"dialog-footer",attrs:{slot:"footer"},slot:"footer"},[a("el-button",{on:{click:function(t){e.dialogVisible=!1}}},[e._v("关闭")]),a("el-button",{attrs:{type:"primary"},on:{click:e.addTag}},[e._v("加入")])],1)])],2)},r=[],o=a("a745"),s=a.n(o);function i(e){if(s()(e)){for(var t=0,a=new Array(e.length);t<e.length;t++)a[t]=e[t];return a}}var n=a("774e"),u=a.n(n),c=a("c8bb"),m=a.n(c);function d(e){if(m()(Object(e))||"[object Arguments]"===Object.prototype.toString.call(e))return u()(e)}function p(){throw new TypeError("Invalid attempt to spread non-iterable instance")}function f(e){return i(e)||d(e)||p()}var b={name:"SelectTags",props:{value:{type:Array,default:[]}},data:function(){return{dialogVisible:!1,tags:{one:"",two:"",three:""}}},methods:{addTag:function(){this.$emit("input",[].concat(f(this.value),[{id:88,name:"添加的新标签"}])),this.dialogVisible=!1},closeTag:function(e){for(var t=[],a=0;a<this.value.length;a++)a!=e&&t.push(this.value[a]);this.$emit("input",t)}}},g=b,v=a("2877"),h=Object(v["a"])(g,l,r,!1,null,"762bf619",null);t["a"]=h.exports},"3d39":function(e,t,a){"use strict";var l=a("52f4"),r=a.n(l);r.a},"445d":function(e,t,a){"use strict";a.r(t);var l=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",{attrs:{id:"editor"}},[a("el-card",[a("el-form",{ref:"ruleForm",staticClass:"u-edit-from",attrs:{model:e.ruleForm,rules:e.rules,"label-width":"160px","label-position":"left"}},[a("el-form-item",{attrs:{label:"原子课名称：",prop:"atomName"}},[a("el-input",{attrs:{disabled:!0},model:{value:e.ruleForm.atomName,callback:function(t){e.$set(e.ruleForm,"atomName",t)},expression:"ruleForm.atomName"}})],1),a("el-form-item",{attrs:{label:"包装原子课名称："}},[a("el-input",{attrs:{placeholder:"请输入包装原子课名称"},model:{value:e.ruleForm.packAtomName,callback:function(t){e.$set(e.ruleForm,"packAtomName",t)},expression:"ruleForm.packAtomName"}})],1),a("el-form-item",{attrs:{label:"教研标记：",prop:"teachMark"}},[a("div",{staticClass:"tag-list"},e._l(e.ruleForm.teachMark,function(t,l){return a("el-tag",{key:l},[e._v("健康护理指导")])}),1)]),a("el-form-item",{attrs:{label:"课程分类：",prop:"courseSort"}},[a("div",{staticClass:"tag-list"},e._l(e.ruleForm.courseSort,function(t,l){return a("el-tag",{key:l},[e._v("患教课程")])}),1)]),a("el-form-item",{attrs:{label:"所属知识点：",prop:"belongKnowledge"}},[a("div",{staticClass:"tag-list"},e._l(e.ruleForm.belongKnowledge,function(t,l){return a("el-tag",{key:l},[e._v("健康护理学习")])}),1)]),a("el-form-item",{attrs:{label:"授课老师："}},[a("el-input",{attrs:{placeholder:"请输入授课老师"},model:{value:e.ruleForm.teacher,callback:function(t){e.$set(e.ruleForm,"teacher",t)},expression:"ruleForm.teacher"}})],1),a("el-form-item",{attrs:{label:"包装原子课介绍：",prop:"packAtomCourse"}},[a("RichText",{model:{value:e.ruleForm.packAtomCourse,callback:function(t){e.$set(e.ruleForm,"packAtomCourse",t)},expression:"ruleForm.packAtomCourse"}})],1),a("el-form-item",{attrs:{label:"运营标签：",prop:"operateLabel"}},[a("SelectTags",{model:{value:e.ruleForm.operateLabel,callback:function(t){e.$set(e.ruleForm,"operateLabel",t)},expression:"ruleForm.operateLabel"}})],1),a("el-form-item",{attrs:{label:"售卖类型：",prop:"salesType"}},[a("el-select",{attrs:{clearable:"",placeholder:"请选择售卖类型"},model:{value:e.ruleForm.salesType,callback:function(t){e.$set(e.ruleForm,"salesType",t)},expression:"ruleForm.salesType"}},e._l(e.$Cfg.sellTypes,function(e){return a("el-option",{key:e.id,attrs:{label:e.name,value:e.id}})}),1)],1),a("el-form-item",{attrs:{label:"售卖金额：",prop:"salesMoney"}},[a("el-input",{attrs:{placeholder:"请输入金额"},model:{value:e.ruleForm.salesMoney,callback:function(t){e.$set(e.ruleForm,"salesMoney",t)},expression:"ruleForm.salesMoney"}})],1),a("el-form-item",{attrs:{label:"折扣类型：",prop:"discountType"}},[a("el-select",{attrs:{clearable:"",placeholder:"请选择折扣类型"},model:{value:e.ruleForm.discountType,callback:function(t){e.$set(e.ruleForm,"discountType",t)},expression:"ruleForm.discountType"}},e._l(e.$Cfg.discountTypes,function(e,t){return a("el-option",{key:t,attrs:{label:e,value:t}})}),1)],1),a("el-form-item",{attrs:{label:"限时免费："}},[a("el-radio",{attrs:{label:"1"},model:{value:e.ruleForm.limtFree,callback:function(t){e.$set(e.ruleForm,"limtFree",t)},expression:"ruleForm.limtFree"}},[e._v("是")]),a("el-radio",{attrs:{label:"2"},model:{value:e.ruleForm.limtFree,callback:function(t){e.$set(e.ruleForm,"limtFree",t)},expression:"ruleForm.limtFree"}},[e._v("否")])],1),a("el-form-item",{attrs:{label:"限时时间：",prop:"limitDate"}},[a("el-date-picker",{attrs:{type:"datetimerange","range-separator":"至","start-placeholder":"开始日期","end-placeholder":"结束日期"},model:{value:e.ruleForm.limitDate,callback:function(t){e.$set(e.ruleForm,"limitDate",t)},expression:"ruleForm.limitDate"}})],1),a("el-form-item",{attrs:{label:"有效天数：",prop:"effectiveDays"}},[a("el-input",{attrs:{placeholder:"请输入天数"},model:{value:e.ruleForm.effectiveDays,callback:function(t){e.$set(e.ruleForm,"effectiveDays",t)},expression:"ruleForm.effectiveDays"}})],1),a("el-form-item",{attrs:{label:"上线时间：",prop:"uptime"}},[a("el-date-picker",{attrs:{type:"date",placeholder:"请选择上线时间"},model:{value:e.ruleForm.uptime,callback:function(t){e.$set(e.ruleForm,"uptime",t)},expression:"ruleForm.uptime"}})],1),a("el-form-item",{staticClass:"u-upload-image",attrs:{label:"课程封面："}},[a("el-upload",{staticClass:"avatar-uploader",attrs:{action:"https://jsonplaceholder.typicode.com/posts/","show-file-list":!1,"on-success":e.handleCover}},[e.imageUrl?a("img",{staticClass:"avatar",attrs:{src:e.imageUrl}}):a("i",{staticClass:"el-icon-plus avatar-uploader-icon"})])],1),a("div",[a("el-button",{attrs:{type:"primary"},on:{click:e.submitPack}},[e._v("包装完成")])],1)],1),a("div",{staticClass:"multiple-title-card"},[a("div",{staticClass:"title"},[e._v("课后练习题部分")]),a("Knowledge")],1),a("div",{staticClass:"multiple-title-card"},[a("div",{staticClass:"title"},[e._v("知识点部分")]),a("Practice")],1)],1)],1)},r=[],o=a("6ec1"),s=a("363f"),i=a("cf4a"),n=a("64c5"),u={data:function(){return{ruleForm:{atomName:"",packAtomName:"",teachMark:["1","2"],courseSort:["1","2"],belongKnowledge:["1","2"],teacher:"",packAtomCourse:"",operateLabel:[],salesType:"",salesMoney:"",discountType:"",limitDate:"",limtFree:"",effectiveDays:"",uptime:"",imageUrl:""},rules:{atomName:[{required:!0,message:"原子课名称不能为空",trigger:"blur"}],teachMark:[{type:"array",required:!0,message:"教研标签不能为空"}],courseSort:[{required:!0,message:"课程分类不能为空"}],belongKnowledge:[{required:!0,message:"所属知识点不能为空"}],packAtomCourse:[{required:!0,message:"包装原子课介绍不能为空"}],operateLabel:[{required:!0,message:"运营标签不能为空",trigger:"click"}],salesType:[{required:!0,message:"售卖类型不能为空",trigger:"change"}],salesMoney:[{required:!0,message:"售卖金额不能为空",trigger:"blur"}],limitDate:[{required:!0,message:"限时时间不能为空",trigger:"change"}],effectiveDays:[{required:!0,message:"有效天数不能为空",trigger:"blur"}],uptime:[{type:"date",required:!0,message:"上线时间不能为空",trigger:"change"}]}}},methods:{handleCover:function(e,t){this.imageUrl=URL.createObjectURL(t.raw)},submitPack:function(){this.$refs.ruleForm.validate(function(e){if(!e)return console.log("error submit!!"),!1;alert("submit!")})}},created:function(){},components:{RichText:o["a"],SelectTags:s["a"],Knowledge:i["a"],Practice:n["a"]}},c=u,m=(a("f812"),a("2877")),d=Object(m["a"])(c,l,r,!1,null,null,null);t["default"]=d.exports},"52f4":function(e,t,a){},"549b":function(e,t,a){"use strict";var l=a("d864"),r=a("63b6"),o=a("241e"),s=a("b0dc"),i=a("3702"),n=a("b447"),u=a("20fd"),c=a("7cd6");r(r.S+r.F*!a("4ee1")(function(e){Array.from(e)}),"Array",{from:function(e){var t,a,r,m,d=o(e),p="function"==typeof this?this:Array,f=arguments.length,b=f>1?arguments[1]:void 0,g=void 0!==b,v=0,h=c(d);if(g&&(b=l(b,f>2?arguments[2]:void 0,2)),void 0==h||p==Array&&i(h))for(t=n(d.length),a=new p(t);t>v;v++)u(a,v,g?b(d[v],v):d[v]);else for(m=h.call(d),a=new p;!(r=m.next()).done;v++)u(a,v,g?s(m,b,[r.value,v],!0):r.value);return a.length=v,a}})},"54a1":function(e,t,a){a("6c1c"),a("1654"),e.exports=a("95d5")},"64c5":function(e,t,a){"use strict";var l=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",[a("el-table",{staticStyle:{width:"100%"},attrs:{data:e.tableData,border:""}},[a("el-table-column",{attrs:{prop:"date",label:"试题",width:"180"}}),a("el-table-column",{attrs:{prop:"name",label:"试题类型",width:"180"}}),a("el-table-column",{attrs:{prop:"address",label:"试题ID"}}),a("el-table-column",{attrs:{prop:"address",label:"题干"}}),a("el-table-column",{attrs:{prop:"address",label:"试卷专用"}}),a("el-table-column",{attrs:{prop:"address",label:"标签"}}),a("el-table-column",{attrs:{prop:"address",label:"试题启用状态"}}),a("el-table-column",{attrs:{prop:"address",label:"审核状态"}}),a("el-table-column",{attrs:{label:"操作",width:"78"},scopedSlots:e._u([{key:"default",fn:function(t){return[a("el-button",{attrs:{type:"info",size:"small"},on:{click:function(a){return e.todetail(t.row)}}},[e._v("预览")])]}}])})],1),a("Pagination",{attrs:{params:e.searchParams,requestFunc:e.requestFunc},on:{returnData:e.returnData}})],1)},r=[],o=a("1799"),s=a("c24f"),i={data:function(){return{requestFunc:s["b"],searchParams:{postTitle:"",postType:"",postStatus:"published"}}},methods:{returnData:function(e){console.log(e)}}},n={mixins:[i],data:function(){return{tableData:[{date:"2016-05-03",name:"Lorem ipsum dolor sit amet,",address:"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores fugit in quae vero. Adipisci blanditiis dignissimos eum facere laudantium quasi ratione repellat vitae! Alias consequatur dolores enim neque similique unde."},{date:"2016-05-02",name:"Lorem ipsum dolor sit amet,",address:"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores fugit in quae vero. Adipisci blanditiis dignissimos eum facere laudantium quasi ratione repellat vitae! Alias consequatur dolores enim neque similique unde."}]}},methods:{todetail:function(e){this.$alert(e,"标题名称",{confirmButtonText:"确定",callback:function(e){}})}},created:function(){},components:{Pagination:o["a"]}},u=n,c=(a("3d39"),a("2877")),m=Object(c["a"])(u,l,r,!1,null,null,null);t["a"]=m.exports},"66f6":function(e,t,a){},"774e":function(e,t,a){e.exports=a("d2d5")},"95d5":function(e,t,a){var l=a("40c3"),r=a("5168")("iterator"),o=a("481b");e.exports=a("584a").isIterable=function(e){var t=Object(e);return void 0!==t[r]||"@@iterator"in t||o.hasOwnProperty(l(t))}},a745:function(e,t,a){e.exports=a("f410")},aaa1:function(e,t,a){},c8bb:function(e,t,a){e.exports=a("54a1")},cf4a:function(e,t,a){"use strict";var l=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",[a("el-table",{staticStyle:{width:"100%"},attrs:{data:e.tableData,border:""}},[a("el-table-column",{attrs:{prop:"date",label:"知识点ID",width:"180"}}),a("el-table-column",{attrs:{prop:"name",label:"知识点名称",width:"180"}}),a("el-table-column",{attrs:{prop:"address",label:"所挂试题数"}}),a("el-table-column",{attrs:{prop:"address",label:"教研标记"}}),a("el-table-column",{attrs:{prop:"address",label:"知识点来源"}}),a("el-table-column",{attrs:{prop:"address",label:"试题启用状态"}}),a("el-table-column",{attrs:{prop:"address",label:"试题启用状态"}}),a("el-table-column",{attrs:{prop:"address",label:"创建时间"}}),a("el-table-column",{attrs:{label:"操作",width:"78"},scopedSlots:e._u([{key:"default",fn:function(t){return[a("el-button",{attrs:{type:"info",size:"small"},on:{click:function(a){return e.todetail(t.row)}}},[e._v("预览")])]}}])})],1),a("Pagination",{attrs:{params:e.searchParams,requestFunc:e.requestFunc},on:{returnData:e.returnData}})],1)},r=[],o=a("1799"),s=a("c24f"),i={data:function(){return{requestFunc:s["b"],searchParams:{postTitle:"",postType:"",postStatus:"published"}}},methods:{returnData:function(e){console.log(e)}}},n={mixins:[i],data:function(){return{tableData:[{date:"2016-05-03",name:"Lorem ipsum dolor sit amet,",address:"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores fugit in quae vero. Adipisci blanditiis dignissimos eum facere laudantium quasi ratione repellat vitae! Alias consequatur dolores enim neque similique unde."},{date:"2016-05-02",name:"Lorem ipsum dolor sit amet,",address:"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores fugit in quae vero. Adipisci blanditiis dignissimos eum facere laudantium quasi ratione repellat vitae! Alias consequatur dolores enim neque similique unde."}]}},methods:{todetail:function(e){this.$alert(e,"标题名称",{confirmButtonText:"确定",callback:function(e){}})}},created:function(){},components:{Pagination:o["a"]}},u=n,c=(a("d881"),a("2877")),m=Object(c["a"])(u,l,r,!1,null,null,null);t["a"]=m.exports},d2d5:function(e,t,a){a("1654"),a("549b"),e.exports=a("584a").Array.from},d881:function(e,t,a){"use strict";var l=a("aaa1"),r=a.n(l);r.a},f410:function(e,t,a){a("1af6"),e.exports=a("584a").Array.isArray},f812:function(e,t,a){"use strict";var l=a("66f6"),r=a.n(l);r.a}}]);
//# sourceMappingURL=chunk-ef948200.24f8c8b0.js.map