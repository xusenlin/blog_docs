```json
{
  "date": "2019.12.04 22:00",
  "tags": ["REACT","Material-Ui"],
  "description":"最近在使用 React 的 Material-Ui 库开发一个前端部署工具，发现 Material-Ui 的 Snackbar 组件不能像 Element UI 的 Notification 那样通过 this.$notify 全局调用，这样在使用Axios请求统一拦截通知就不那么方便了,那么我们来实现一下诸如 Snackbar.error()、Snackbar.warning()、Snackbar.success()的方法"
}
```


### 实现效果

```javascript
Snackbar.error("This is an error message!");
Snackbar.warning("This is a warning message!");
Snackbar.info("This is an information message!");
Snackbar.success("This is a success message!");
```

![Snackbar](http://xusenlin.com/assets/images/snackbar.png)


>我们规定一次只能显示一个消息条。


### 思路和结构

因为无能如何都要将 Snackbar 组件渲染到 dom 并拿到组件的实例对象，每次调用判断如果已经有 Snackbar 组件的实例对象就通过 对象调用 组件内的方法。

目录结构



```
── snackbar
   ├── index.js
   ├── snackbar.js
   ├── snackbarContentWrapper.js
   └── snackbarInstance.js
```


1. index.js 是对外的入口，主要提供相应的方法

```javascript
import snackbar from './snackbarInstance'

let snackbarInstance;
const notice = (type, content, duration ) => {
    if (!snackbarInstance) snackbarInstance = snackbar;
    return snackbarInstance.openSnackbar(type, content, duration)
};

export default {
    info(content, duration= 2000) {
        return notice('info', content, duration)
    },
    success(content, duration= 2000) {
        return notice('success', content, duration)
    },
    warning(content, duration= 2000) {
        return notice('warning', content, duration)
    },
    error(content, duration= 2000) {
        return notice('error', content, duration)
    },
}

```

2. snackbarInstance.js 主要负责渲染组件实例并返回实列对象

```javascript
import React from "react";
import ReactDOM from "react-dom";
import Snackbar from './snackbar'

const snackbarDom = document.getElementById('snackbar');


export default ReactDOM.render(<Snackbar/>, snackbarDom)
```

3. snackbar.js  snackbar组件，并提供了关键的openSnackbar方法供外部调用

```javascript
import React from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContentWrapper from './snackbarContentWrapper'


class CustomizeSnackbar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            content:"",
            duration:4000,
            type:"info"
        };
    }

    openSnackbar(type, content, duration){
        this.setState({
            open: true,
            type:type,
            content:content,
            duration:duration
        })
    }
    handleClose() {
        this.setState({open: false})
    }

    render() {
        return (
            <Snackbar
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                open={this.state.open}
                autoHideDuration={this.state.duration}
                onClose={this.handleClose.bind(this)}
            >
                <SnackbarContentWrapper
                    onClose={this.handleClose.bind(this)}
                    variant={this.state.type}
                    message={this.state.content}
                />
            </Snackbar>
        );
    }

}

export default CustomizeSnackbar

```

4. snackbarContentWrapper.js 就是snackbar具体实现的细节了，提供了不同类型的消息条和不同的图标。

```javascript
import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import CloseIcon from '@material-ui/icons/Close';
import {amber, green} from '@material-ui/core/colors/index';
import IconButton from '@material-ui/core/IconButton/index';
import SnackbarContent from '@material-ui/core/SnackbarContent/index';
import WarningIcon from '@material-ui/icons/Warning';
import {makeStyles} from '@material-ui/core/styles/index';


const variantIcon = {
    success: CheckCircleIcon,
    warning: WarningIcon,
    error: ErrorIcon,
    info: InfoIcon,
};
const useStyles = makeStyles(theme => ({
    success: {
        backgroundColor: green[600],
    },
    error: {
        backgroundColor: theme.palette.error.dark,
    },
    info: {
        backgroundColor: theme.palette.primary.main,
    },
    warning: {
        backgroundColor: amber[700],
    },
    icon: {
        fontSize: 20,
    },
    iconVariant: {
        opacity: 0.9,
        marginRight: theme.spacing(1),
    },
    message: {
        display: 'flex',
        alignItems: 'center',
    },
}));

function SnackbarContentWrapper(props) {
    const classes = useStyles();
    const {message, onClose, variant, ...other} = props;
    const Icon = variantIcon[variant];

    return (
        <SnackbarContent
            className={clsx(classes[variant])}
            aria-describedby="client-snackbar"
            message={
                <span id="client-snackbar" className={classes.message} style={{whiteSpace: "pre-wrap"}}>
          <Icon className={clsx(classes.icon, classes.iconVariant)}/>
                    {message}
        </span>
            }
            action={[
                <IconButton key="close" aria-label="close" color="inherit" onClick={onClose}>
                    <CloseIcon className={classes.icon}/>
                </IconButton>,
            ]}
            {...other}
        />
    );
}

SnackbarContentWrapper.propTypes = {
    message: PropTypes.string,
    onClose: PropTypes.func,
    variant: PropTypes.oneOf(['error', 'info', 'success', 'warning']).isRequired,
};

export default SnackbarContentWrapper
```
